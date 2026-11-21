package nz.piechart.companion

import java.util.Locale
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/**
 * Build an evidence-backed geometric nutrition table, one unfamiliar label at
 * a time. Per-frame geometry works without tracking; independently registered
 * views can fill missing regions. A locked result is immutable until the user
 * explicitly asks to rescan that field.
 */
internal class LiveLabelInterpreter {
    data class Highlight(val word: NutritionPanelParser.Word, val field: String?,
                         val heading: Boolean = false, val value: Boolean = false,
                         val confirmed: Boolean = false)
    data class State(val basis: String?, val names: Set<String>,
                     val readings: Map<String, NutritionPanelParser.Reading>,
                     val provisional: Map<String, NutritionPanelParser.Reading>,
                     val highlights: List<Highlight>, val headingVisible: Boolean,
                     val message: String, val mapAligned: Boolean = false,
                     val lockedFields: Set<String> = emptySet())

    /** Translation-only image tracker evidence in OCR image pixel coordinates.
     * Never sufficient without first calibrating against two recognised anchors. */
    data class Motion(val dx: Float, val dy: Float, val aligned: Boolean, val matches: Int)

    /** A directly observed printed row, not a predicted location from a map. */
    private data class Line(val words: List<NutritionPanelParser.Word>) {
        val cy: Float get() = words.map { it.cy }.average().toFloat()
    }
    private data class Candidate(val word: NutritionPanelParser.Word,
                                 val reading: NutritionPanelParser.Reading)
    private data class Observation(val reading: NutritionPanelParser.Reading,
                                   val positions: MutableList<GeometricLabelMap.Point> = mutableListOf(),
                                   var lastSeen: Long = 0L,
                                   var rowCountVerified: Boolean = false,
                                   var directRowVerified: Boolean = false)
    private data class Rejection(val pos: GeometricLabelMap.Point?, val time: Long)
    private data class Heading(val basis: String, val word: NutritionPanelParser.Word)
    /** Row counting is independent corroboration, not a substitute for geometry.
     * An incomplete column is UNKNOWN, never assumed to have a fixed template. */
    internal enum class RowEvidence { AGREES, DISAGREES, UNAVAILABLE }
    private val order = listOf("energy", "protein", "fat", "carbohydrate", "fibre")
    private val names = linkedSetOf<String>()
    private val map = GeometricLabelMap()
    private val candidates = linkedMapOf<String, MutableMap<String, Observation>>()
    private val locked = linkedMapOf<String, NutritionPanelParser.Reading>()
    private val rejected = mutableMapOf<String, Rejection>()
    private var basis: String? = null
    private var motionCalibration: GeometricLabelMap.Point? = null
    private var lastConfirmed = emptyMap<String, NutritionPanelParser.Reading>()
    private var lastTentative = emptyMap<String, NutritionPanelParser.Reading>()
    private var currentPositions = emptyMap<String, NutritionPanelParser.Word>()

    private val valuePattern = Regex("""^(\d{1,5}(?:[.,]\d{1,3})?)\s*(kcal|kj|mg|g)\b.*$""", RegexOption.IGNORE_CASE)
    private val bareNumber = Regex("""^(\d{1,5}(?:[.,]\d{1,3})?)$""")
    private val unitPattern = Regex("""^(kcal|kj|mg|g)$""", RegexOption.IGNORE_CASE)
    private val hundred = Regex("""\b100\s*(g|ml)\b""", RegexOption.IGNORE_CASE)
    private val per100 = Regex("""\bper\s*100\s*(g|ml)\b""", RegexOption.IGNORE_CASE)

    fun reset() {
        names.clear(); map.reset(); candidates.clear(); locked.clear(); rejected.clear()
        basis = null; motionCalibration = null
        lastConfirmed = emptyMap(); lastTentative = emptyMap(); currentPositions = emptyMap()
    }

    /** Rejecting one nutrient does not change any other accepted nutrient. */
    fun reject(field: String, now: Long): Boolean {
        if (field !in order && field != "heading") return false
        val word = currentPositions[field]
        rejected[field] = Rejection(word?.let { GeometricLabelMap.Point(it.cx, it.cy) }, now)
        if (field == "heading") {
            // Explicitly disputing the basis invalidates the column association.
            // Keep the nutrient names but require the table and values to be rebuilt.
            map.reset(); basis = null; motionCalibration = null
            candidates.clear(); locked.clear()
            lastConfirmed = emptyMap(); lastTentative = emptyMap()
        } else {
            locked.remove(field); candidates.remove(field)
            lastConfirmed = lastConfirmed - field; lastTentative = lastTentative - field
        }
        return true
    }

    fun observe(words: List<NutritionPanelParser.Word>, now: Long, motion: Motion? = null): State {
        val valid = words.filter { it.text.isNotBlank() && it.height > 0f }
        val visibleLines = lines(valid)
        val rowByField = linkedMapOf<String, Line>()
        val labels = linkedMapOf<String, NutritionPanelParser.Word>()
        val anchors = linkedMapOf<String, NutritionPanelParser.Word>()
        for (word in valid.sortedBy { it.y }) {
            val target = category(word.text)
            if (target != null) {
                labels.putIfAbsent(target, word)
                rowByField.putIfAbsent(target, visibleLines.minByOrNull { abs(it.cy - word.cy) } ?: continue)
                anchors.putIfAbsent("row:$target", word)
            } else {
                val auxiliary = otherRow(word.text)
                if (auxiliary != null) anchors.putIfAbsent("row:$auxiliary", word)
            }
        }
        val header = findHeading(valid)
        val isWrongBasis = header != null && basis != null && basis != header.basis
        val visibleHeader = header?.takeUnless { isWrongBasis || blocked("heading", it.word, now) }
        // Establish the map from a genuinely identified nutrient name. Future
        // alignment needs at least two matched text anchors; one is insufficient.
        val textFit = map.register(anchors, labels.isNotEmpty(),
            visibleHeader?.let { it.basis to it.word })
        // Calibrate image motion against a two-anchor OCR fit before using it
        // to bridge frames containing values but no repeated nutrient names.
        if (motion != null && !motion.aligned) motionCalibration = null
        if (motion != null && motion.aligned && textFit != null && textFit.inliers >= 2 &&
            abs(textFit.a - 1f) < .035f && abs(textFit.b) < .035f) {
            val corrections = anchors.mapNotNull { (key, word) ->
                map.anchor(key)?.let { known ->
                    GeometricLabelMap.Point(known.x - word.cx - motion.dx,
                        known.y - word.cy - motion.dy)
                }
            }
            if (corrections.size >= 2 &&
                corrections.maxOf { it.x } - corrections.minOf { it.x } < 18f &&
                corrections.maxOf { it.y } - corrections.minOf { it.y } < 18f) {
                motionCalibration = GeometricLabelMap.Point(
                    corrections.map { it.x }.average().toFloat(),
                    corrections.map { it.y }.average().toFloat())
            }
        }
        val fallbackFit = if (textFit == null && motion?.aligned == true &&
            motion.matches >= 4 && motionCalibration != null) {
            val cal = motionCalibration!!
            GeometricLabelMap.Fit(1f, 0f, motion.dx + cal.x, motion.dy + cal.y,
                motion.matches, 0f)
        } else null
        val fit = textFit ?: fallbackFit
        if (fallbackFit != null && visibleHeader != null)
            map.noteHeading(visibleHeader.basis, visibleHeader.word, fallbackFit)
        if (visibleHeader != null && basis == null) basis = visibleHeader.basis
        val highlights = mutableListOf<Highlight>()
        val positions = linkedMapOf<String, NutritionPanelParser.Word>()
        for ((field, word) in labels) {
            positions[field] = word
            names += field
            if (!blocked(field, word, now)) highlights += Highlight(word, field)
        }
        if (visibleHeader != null) {
            highlights += Highlight(visibleHeader.word, null, heading = true, confirmed = true)
            positions["heading"] = visibleHeader.word
        }

        // v0.2.012: A visible, independently identified row + per-100 heading
        // takes priority. Do NOT use the map's predicted row position to pick
        // a different row's value when the actual printed row is available.
        // Cross-frame geometric matches remain optional/provisional evidence.
        val registered = fit != null && map.heading != null && basis == map.headingBasis
        val servingColumns = servingColumnCentres(valid, visibleHeader?.word)
        for (field in order) {
            val label = labels[field]
            val row = rowByField[field]
            var best: Candidate? = null
            var directRow = false
            var rowCheck = RowEvidence.UNAVAILABLE
            if (visibleHeader != null && label != null && row != null) {
                val headingPos = visibleHeader.word
                val inRow = row.words.filter { it.x >= label.right + 1f }.mapNotNull { token ->
                    val reading = parseValue(token, row.words, field) ?: return@mapNotNull null
                    val gap = abs(token.cx - headingPos.cx)
                    // Width of a printed heading isn't a fixed nutrition-table template.
                    // Use the local OCR scale to determine its column search width.
                    val tolerance = max(32f, max(token.height * 3f, headingPos.width * .55f))
                    if (gap > tolerance || token.cy <= headingPos.cy) return@mapNotNull null
                    if (servingColumns.any { abs(token.cx - it) <= gap + token.height * .8f })
                        return@mapNotNull null
                    Candidate(token, reading)
                }.sortedWith(compareBy<Candidate> {
                    abs(it.word.cx - headingPos.cx)
                }.thenBy { if (field == "energy" && it.reading.unit == "kJ") 0 else 1 })
                val first = inRow.firstOrNull()
                val rival = inRow.drop(1).firstOrNull { other -> first != null &&
                    abs(other.word.cx - headingPos.cx) -
                        abs(first.word.cx - headingPos.cx) < max(8f, first.word.height) &&
                        !(field == "energy" && other.reading.unit != first.reading.unit)
                }
                if (first != null && rival == null) {
                    rowCheck = rowEvidence(anchors.values.toList(), valid,
                        headingPos, label, first.word)
                    if (rowCheck != RowEvidence.DISAGREES) {
                        best = first
                        directRow = true
                    }
                }
            }
            // Extra camera views may give useful provisional interpretations,
            // but a map-only match must NEVER become an accepted/locked value.
            if (best == null && registered && (visibleHeader == null || label == null)) {
                val anchorRow = map.anchor("row:$field")
                val anchorHeading = map.heading
                if (anchorRow != null && anchorHeading != null) {
                    val otherRows = map.mappedNames.values.map { abs(it.y - anchorRow.y) }
                        .filter { it > 10f }
                    val limit = min(11f, (otherRows.minOrNull() ?: 70f) * .35f)
                    val possible = valid.mapNotNull { token ->
                        val r = parseValue(token, valid, field) ?: return@mapNotNull null
                        val pt = fit!!.place(token)
                        if (abs(pt.y - anchorRow.y) > limit ||
                            abs(pt.x - anchorHeading.x) > max(32f, token.height * 2f) ||
                            pt.x < anchorRow.x + token.height * 2f) return@mapNotNull null
                        Candidate(token, r)
                    }.sortedBy { abs(fit!!.place(it.word).x - anchorHeading.x) }
                    if (possible.size == 1) best = possible[0]
                }
            }
            best ?: continue
            if (blocked(field, best.word, now)) continue
            // Locked readings are never overwritten by current OCR or map motion.
            if (field in locked) {
                if (best.reading.key == locked[field]?.key)
                    highlights += Highlight(best.word, field, value = true, confirmed = true)
                continue
            }
            positions[field] = best.word
            val group = candidates.getOrPut(field) { linkedMapOf() }
            val item = group.getOrPut(best.reading.key) { Observation(best.reading) }
            val at = GeometricLabelMap.Point(best.word.cx, best.word.cy)
            if (item.positions.none {
                    abs(it.x - at.x) + abs(it.y - at.y) < max(18f, best.word.height * 1.2f)
                }) item.positions += at
            item.lastSeen = now
            if (directRow) item.directRowVerified = true
            if (rowCheck == RowEvidence.AGREES) item.rowCountVerified = true
            highlights += Highlight(best.word, field, value = true)
        }

        // Assemble all candidates BEFORE deciding to lock any one nutrient.
        // Otherwise a high protein number could lock before we notice that
        // protein + carbohydrate exceeds 100 g per 100 g.
        val tentative = linkedMapOf<String, NutritionPanelParser.Reading>()
        val rankings = linkedMapOf<String, List<Observation>>()
        for (field in order) {
            if (field in locked || field in rejected || basis == null) continue
            val entries = candidates[field]?.values?.sortedByDescending { it.positions.size } ?: continue
            val strongest = entries.firstOrNull() ?: continue
            rankings[field] = entries
            tentative[field] = strongest.reading
        }
        for (field in order) {
            val entries = rankings[field] ?: continue
            val strongest = entries.first()
            val highUnpunctuated = strongest.reading.unit == "g" &&
                !strongest.reading.printed.contains('.') &&
                !strongest.reading.printed.contains(',') && strongest.reading.value >= 10
            // Where we have a complete, comparable sequence, require BOTH
            // measured position and matching row ordinal. In incomplete views
            // accumulate more independent observations rather than invent rows.
            val requiredViews = if (strongest.rowCountVerified) {
                if (highUnpunctuated) 4 else 3
            } else 5
            if (strongest.positions.size < requiredViews || !strongest.directRowVerified) continue
            if (entries.drop(1).any { it.positions.isNotEmpty() &&
                    (decimalConfusable(strongest.reading, it.reading) ||
                        it.positions.size >= strongest.positions.size - 1) }) continue
            if (strongest.reading.unit == "g" && strongest.reading.value >= 35.0 &&
                (locked.keys + tentative.keys).count { it in listOf("protein", "fat", "carbohydrate", "fibre") } < 3) continue
            if (macroConflict(field, strongest.reading, tentative)) continue
            locked[field] = strongest.reading
            tentative.remove(field)
        }
        lastConfirmed = locked.toMap(); lastTentative = tentative
        currentPositions = positions
        val message = when {
            isWrongBasis -> "Conflicting per-100 heading; check which table is in view"
            basis == null -> "Show the labelled per-100 g/mL column"
            locked.size == 5 -> "Five readings confirmed and locked. Tap one to rescan"
            !registered && visibleHeader == null -> "Find an overlapping view of recognised row names and the per-100 column"
            else -> "${locked.size}/5 locked · ${tentative.size} checking · move slightly for another view"
        }
        return State(basis, names.toSet(), locked.toMap(), tentative.toMap(),
            highlights.map { if (it.value && it.field in locked) it.copy(confirmed = true) else it },
            visibleHeader != null, message, registered, locked.keys.toSet())
    }

    /** Group a printed row from the current image. This is not a fixed table
     * template and is independent of the longer-lived geometric label map. */
    private fun lines(words: List<NutritionPanelParser.Word>): List<Line> {
        val items = words.filter { it.text.isNotBlank() && it.height > 0f }.sortedBy { it.cy }
        if (items.isEmpty()) return emptyList()
        val heights = items.map { it.height }.sorted()
        val tolerance = max(6f, heights[heights.size / 2] * .48f)
        val groups = mutableListOf<MutableList<NutritionPanelParser.Word>>()
        for (w in items) {
            val g = groups.lastOrNull()
            if (g != null && abs(g.map { it.cy }.average().toFloat() - w.cy) <= tolerance) g += w
            else groups += mutableListOf(w)
        }
        return groups.map { Line(it.sortedBy { w -> w.x }) }
    }

    /** Independently check the candidate's ordinal position in the *observed*
     * table against the ordinal position of the named row. Count intermediate
     * rows (saturated fat, sugars, sodium...) too, not just five targets.
     * Only make a verdict when the two visible sequences cover identical
     * row extents and contain the same number of rows; otherwise ask for
     * more evidence. Unlike a fixed nutritional template, this works with
     * whatever number and order of printed rows this particular label has.
     */
    internal fun rowEvidence(
        nameWords: List<NutritionPanelParser.Word>,
        words: List<NutritionPanelParser.Word>,
        heading: NutritionPanelParser.Word,
        target: NutritionPanelParser.Word,
        value: NutritionPanelParser.Word
    ): RowEvidence {
        if (nameWords.size < 3) return RowEvidence.UNAVAILABLE
        val typicalHeight = nameWords.map { it.height }.sorted()[nameWords.size / 2]
        val toleranceY = max(7f, typicalHeight * .58f)
        fun distinctRows(ys: List<Float>): List<Float> {
            val clusters = mutableListOf<MutableList<Float>>()
            for (y in ys.sorted()) {
                val last = clusters.lastOrNull()
                if (last != null && abs(y - last.average()) <= toleranceY) last += y
                else clusters += mutableListOf(y)
            }
            return clusters.map { it.average().toFloat() }
        }
        val namesY = distinctRows(nameWords.map { it.cy })
        if (namesY.size < 3) return RowEvidence.UNAVAILABLE
        val top = namesY.first(); val bottom = namesY.last()
        val colLimit = max(35f, typicalHeight * 5.2f)
        val valuesY = distinctRows(words.asSequence().filter {
            it.cy >= top - toleranceY && it.cy <= bottom + toleranceY &&
                it.cy > heading.cy + typicalHeight * .25f &&
                abs(it.cx - heading.cx) <= colLimit &&
                (valuePattern.matches(it.text.trim()) || bareNumber.matches(it.text.trim()))
        }.map { it.cy }.toList())
        // An absent or obscured entry cannot shift all later rows. Count only
        // when we can see both complete sequences from their first to last.
        if (valuesY.size != namesY.size || valuesY.size < 3 ||
            abs(valuesY.first() - top) > typicalHeight * 1.2f ||
            abs(valuesY.last() - bottom) > typicalHeight * 1.2f) return RowEvidence.UNAVAILABLE
        // Establish the target row from its identified name, not the OCR
        // number position; otherwise this is just distance matching twice.
        val nameRank = namesY.indices.minByOrNull { abs(namesY[it] - target.cy) }
            ?: return RowEvidence.UNAVAILABLE
        val valueRank = valuesY.indices.minByOrNull { abs(valuesY[it] - value.cy) }
            ?: return RowEvidence.UNAVAILABLE
        // If the candidate is far from *all* observed value rows the
        // sequence has not established its identity.
        if (abs(valuesY[valueRank] - value.cy) > toleranceY) return RowEvidence.UNAVAILABLE
        return if (nameRank == valueRank)
            RowEvidence.AGREES else RowEvidence.DISAGREES
    }

    /** OCR can repeatedly omit one printed decimal point; never auto-lock a
     * contradictory decimal-versus-integer pair without user intervention. */
    private fun decimalConfusable(a: NutritionPanelParser.Reading,
                                  b: NutritionPanelParser.Reading): Boolean {
        if (a.unit != b.unit || a.value == b.value || a.value == 0.0 || b.value == 0.0) return false
        val v1 = min(a.value, b.value); val v2 = max(a.value, b.value)
        return abs(v2 / v1 - 10.0) < .09 ||
            a.printed.replace(".", "").replace(",", "") ==
            b.printed.replace(".", "").replace(",", "")
    }

    private fun macroConflict(field: String, reading: NutritionPanelParser.Reading,
                              provisional: Map<String, NutritionPanelParser.Reading>): Boolean {
        if (field == "energy") return false
        val macroKeys = listOf("protein", "fat", "carbohydrate", "fibre")
        val values = macroKeys.mapNotNull { key ->
            (if (key == field) reading else locked[key] ?: provisional[key])?.value
        }
        // This is a plausibility veto, never a recipe to replace a printed value.
        return reading.value >= 10.0 && values.size >= 2 && values.sum() > 101.0
    }

    private fun blocked(field: String, word: NutritionPanelParser.Word, now: Long): Boolean {
        val item = rejected[field] ?: return false
        val prior = item.pos
        val moved = prior == null || abs(prior.x - word.cx) + abs(prior.y - word.cy) >=
            max(28f, word.height * 2f)
        if (now - item.time >= 1200 && moved) { rejected.remove(field); return false }
        return true
    }

    private fun category(s: String): String? {
        val v = s.lowercase(Locale.ROOT)
        if (Regex("""\b(saturat\w*|trans|sugars?|sodium|salt|unsaturated)\b""").containsMatchIn(v)) return null
        return when {
            Regex("""\b(energy|calories)\b""").containsMatchIn(v) -> "energy"
            Regex("""\bproteins?\b""").containsMatchIn(v) -> "protein"
            Regex("""\b(total\s*)?fat\b""").containsMatchIn(v) -> "fat"
            Regex("""\bcarbohydrat\w*\b""").containsMatchIn(v) -> "carbohydrate"
            Regex("""\b(fibre|fiber)\b""").containsMatchIn(v) -> "fibre"
            else -> null
        }
    }
    private fun otherRow(s: String): String? = when {
        Regex("""\bsaturat\w*\b""", RegexOption.IGNORE_CASE).containsMatchIn(s) -> "saturated"
        Regex("""\btrans\b""", RegexOption.IGNORE_CASE).containsMatchIn(s) -> "trans"
        Regex("""\bsugars?\b""", RegexOption.IGNORE_CASE).containsMatchIn(s) -> "sugars"
        Regex("""\bsodium\b""", RegexOption.IGNORE_CASE).containsMatchIn(s) -> "sodium"
        Regex("""\bgluten\b""", RegexOption.IGNORE_CASE).containsMatchIn(s) -> "gluten"
        else -> null
    }

    private fun findHeading(words: List<NutritionPanelParser.Word>): Heading? {
        val options = mutableListOf<Pair<Int, Heading>>()
        val sorted = words.sortedBy { it.cy }
        for (w in sorted) {
            var text = w.text.trim()
            var marker = w
            var explicit = per100.containsMatchIn(text)
            if (!hundred.containsMatchIn(text)) {
                // ML Kit frequently separates "100" and "g" into two words.
                if (!Regex("""^100$""").matches(text)) continue
                val unit = words.filter { it.x >= w.right && it.x - w.right < max(22f, w.height * 1.8f) &&
                    abs(it.cy - w.cy) < max(9f, w.height * .6f) }
                    .firstOrNull { it.text.matches(Regex("""^(g|ml)$""", RegexOption.IGNORE_CASE)) } ?: continue
                text = "100 ${unit.text}"
                marker = NutritionPanelParser.Word(text, w.x, min(w.y, unit.y), unit.right - w.x,
                    max(w.y + w.height, unit.y + unit.height) - min(w.y, unit.y))
            }
            val match = hundred.find(text) ?: continue
            val row = words.filter { abs(it.cy - w.cy) <= max(12f, w.height * .72f) }
            // A serving size of 100 g is NOT a nutritional values-column heading.
            val sameText = row.joinToString(" ") { it.text }.lowercase(Locale.ROOT)
            if (Regex("""serving\s*size|serve\s*size|net\s*weight""").containsMatchIn(sameText)) continue
            val above = words.filter { it.cy >= w.cy - max(75f, w.height * 3.2f) && it.cy <= w.cy + w.height * .8f }
            val near = above.filter { abs(it.cx - w.cx) < max(110f, w.height * 6f) }
            val hasPer = near.any { it.text.matches(Regex("""per\b.*""", RegexOption.IGNORE_CASE)) }
            explicit = explicit || (hasPer && near.any { it !== w })
            val columns = row.any { it !== w && Regex("""\b(qty|quantity|average|serve|serving|per)\b""",
                RegexOption.IGNORE_CASE).containsMatchIn(it.text) }
            val nearbyNutrient = words.any { category(it.text) != null &&
                it.cy > w.cy && it.cy < w.cy + max(210f, w.height * 12f) }
            // Bare "100 g" is valid on some tables, but only with corroborating
            // column-heading context and target nutrient rows immediately below.
            if (!explicit && !(columns && nearbyNutrient)) continue
            val basis = if (match.groupValues[1].equals("ml", true)) "100 mL" else "100 g"
            options += (if (explicit) 2 else 1) to Heading(basis, marker)
        }
        val best = options.maxByOrNull { it.first } ?: return null
        if (options.any { it.second.basis != best.second.basis }) return null
        return best.second
    }

    private fun servingColumnCentres(words: List<NutritionPanelParser.Word>,
                                     header: NutritionPanelParser.Word?): List<Float> {
        if (header == null) return emptyList()
        return words.filter { word ->
            abs(word.cy - header.cy) < max(58f, header.height * 3.2f) &&
                Regex("""\b(serving|serve)\b""", RegexOption.IGNORE_CASE).containsMatchIn(word.text) &&
                abs(word.cx - header.cx) > max(35f, header.height * 2f)
        }.map { it.cx }
    }

    private fun parseValue(w: NutritionPanelParser.Word, words: List<NutritionPanelParser.Word>,
                           field: String): NutritionPanelParser.Reading? {
        val text = w.text.trim()
        val immediate = valuePattern.matchEntire(text)
        val bare = bareNumber.matchEntire(text)
        if (immediate == null && bare == null) return null
        val printed = immediate?.groupValues?.get(1) ?: bare!!.groupValues[1]
        val value = printed.replace(',', '.').toDoubleOrNull() ?: return null
        val suffix = immediate?.groupValues?.get(2)?.lowercase(Locale.ROOT) ?: run {
            words.filter { it.x >= w.right && it.x - w.right <= max(20f, w.height * 1.6f) &&
                abs(it.cy - w.cy) < max(12f, w.height * .9f) }
                .minByOrNull { it.x }?.text?.trim()?.lowercase(Locale.ROOT).orEmpty()
        }
        val unit = when (suffix) { "kj" -> "kJ"; "kcal" -> "kcal"; "g" -> "g"; "mg" -> "mg"; else -> "" }
        if (field == "energy" && unit !in setOf("kJ", "kcal")) return null
        if (field != "energy" && (unit != "g" || value > 100.0)) return null
        return NutritionPanelParser.Reading(value, unit, printed)
    }
}
