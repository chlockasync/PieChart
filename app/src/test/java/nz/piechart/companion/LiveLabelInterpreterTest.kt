package nz.piechart.companion

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LiveLabelInterpreterTest {
    private fun word(text: String, x: Int, y: Int, w: Int = 54) =
        NutritionPanelParser.Word(text, x.toFloat(), y.toFloat(), w.toFloat(), 18f)

    private fun table(dx: Int = 0, includeHeading: Boolean = true,
                      proteinPer100: String = "6.9g"): List<NutritionPanelParser.Word> {
        fun w(s: String, x: Int, y: Int, width: Int = 54) = word(s, x + dx, y, width)
        return mutableListOf(
            w("ENERGY", 175, 204, 90), w("281kcal", 340, 204), w("3351kcal", 522, 204, 78),
            w("PROTEIN", 175, 245, 95), w("5.5g", 350, 245), w(proteinPer100, 522, 245),
            w("FAT", 175, 282, 43), w("1.0g", 350, 282), w("1.3g", 522, 282),
            w("SATURATED", 185, 318, 105), w("0.3g", 350, 318), w("0.4g", 522, 318),
            w("CARBOHYDRATE", 175, 355, 158), w("61.6g", 350, 355), w("77g", 522, 355),
            w("SUGARS", 185, 389, 80), w("0.2g", 350, 389), w("0.3g", 522, 389),
            w("FIBRE", 175, 427, 56), w("1.5g", 350, 427), w("1.9g", 522, 427),
            w("QTY", 332, 155, 48), w("PER", 382, 155, 42), w("SERVING", 422, 155, 80)
        ).apply {
            if (includeHeading) addAll(listOf(w("QTY", 475, 155, 42),
                w("PER", 515, 155, 42), w("100g", 559, 155, 56)))
        }
    }

    @Test fun valuesUseVerifiedPer100ColumnAndOnlyTargetWordsAreMarked() {
        val reader = LiveLabelInterpreter()
        val result = reader.observe(table(), 100)
        assertEquals("100 g", result.basis)
        assertEquals(5, result.names.size)
        assertEquals("6.9", result.provisional["protein"]?.printed)
        assertTrue(result.highlights.any { it.heading })
        assertFalse(result.highlights.any { it.word.text.contains("SATURATED") })
        assertFalse(result.highlights.any { it.word.text.contains("SERVING") })
    }

    @Test fun absenceOfPer100OrOfValueNeverFallsBackToServing() {
        val withoutHeading = LiveLabelInterpreter().observe(table(includeHeading = false), 100)
        assertTrue(withoutHeading.readings.isEmpty())
        assertTrue(withoutHeading.provisional.isEmpty())
        val absentValue = LiveLabelInterpreter().observe(table(proteinPer100 = ""), 100)
        assertFalse(absentValue.provisional.containsKey("protein"))
    }

    @Test fun rowCountingCrossChecksGeometryIncludingIntermediateRows() {
        val reader = LiveLabelInterpreter()
        val words = table()
        val nameWords = words.filter {
            it.text in setOf("ENERGY", "PROTEIN", "FAT", "SATURATED", "CARBOHYDRATE", "SUGARS", "FIBRE")
        }
        val header = words.first { it.text == "100g" }
        val protein = words.first { it.text == "PROTEIN" }
        val per100Protein = words.first { it.text == "6.9g" }
        val fatValue = words.first { it.text == "1.3g" }
        assertEquals(LiveLabelInterpreter.RowEvidence.AGREES,
            reader.rowEvidence(nameWords, words, header, protein, per100Protein))
        assertEquals(LiveLabelInterpreter.RowEvidence.DISAGREES,
            reader.rowEvidence(nameWords, words, header, protein, fatValue))
        assertEquals(LiveLabelInterpreter.RowEvidence.UNAVAILABLE,
            reader.rowEvidence(nameWords, words - per100Protein, header, protein, per100Protein))
    }

    @Test fun lockedValuesSurviveConflictingOcrAndRescanOnlyTheSelectedNutrient() {
        val reader = LiveLabelInterpreter()
        for ((i, dx) in listOf(0, 40, 80, 120).withIndex()) {
            reader.observe(table(dx), 100L + i * 400)
        }
        val accepted = reader.observe(table(160), 2000)
        assertEquals("6.9", accepted.readings["protein"]?.printed)
        assertEquals(5, accepted.readings.size)
        val changed = reader.observe(table(180, proteinPer100 = "8.4g"), 2250)
        assertEquals("6.9", changed.readings["protein"]?.printed)
        assertEquals(accepted.readings["fat"], changed.readings["fat"])
        assertTrue(reader.reject("protein", 2300))
        val afterTap = reader.observe(table(180, proteinPer100 = "8.4g"), 2400)
        assertFalse(afterTap.readings.containsKey("protein"))
        assertFalse(afterTap.provisional.containsKey("protein"))
        assertEquals(accepted.readings["fat"], afterTap.readings["fat"])
        val afterNewView = reader.observe(table(240, proteinPer100 = "8.4g"), 3700)
        assertEquals("8.4", afterNewView.provisional["protein"]?.printed)
        assertEquals(accepted.readings["fat"], afterNewView.readings["fat"])
    }

    @Test fun wrappedPer100HeadingRecognised() {
        val result = LiveLabelInterpreter().observe(listOf(
            word("per", 515, 90, 37), word("100", 520, 113, 37),
            word("g", 558, 113, 19)), 100)
        assertEquals("100 g", result.basis)
    }
    @Test fun glutenAndTransRowsNeverBecomeFatOrCarbohydrate() {
        // Reproduces the quinoa failure in the 0.2.011 phone screenshots:
        // a 0 g value in a subrow may be mistaken for fat/carbohydrate.
        val reference = mutableListOf(
            word("Energy", 100, 200, 92), word("1270kJ", 350, 200), word("1590kJ", 530, 200),
            word("Protein", 100, 240, 95), word("6.6g", 350, 240), word("8.2g", 530, 240),
            word("gluten", 110, 270, 90), word("0g", 350, 270), word("0g", 530, 270),
            word("Fat", 100, 300, 70), word("1.1g", 350, 300), word("1.4g", 530, 300),
            word("saturated", 110, 330, 92), word("0.3g", 350, 330), word("0.4g", 530, 330),
            word("trans", 110, 360, 90), word("0g", 350, 360), word("0g", 530, 360),
            word("Carbohydrate", 100, 400, 150), word("65.1g", 350, 400), word("81.4g", 530, 400),
            word("sugars", 110, 430, 82), word("0.2g", 350, 430), word("0.3g", 530, 430),
            word("Fibre", 100, 460, 77), word("1.3g", 350, 460), word("1.6g", 530, 460),
            word("PER", 480, 160, 45), word("100g", 540, 160, 52),
            word("PER", 300, 160, 45), word("SERVING", 355, 160, 80)
        )
        val reader = LiveLabelInterpreter()
        for (i in 0..5) {
            val words = reference.map { it.copy(x = it.x + i * 42f) }
            val state = reader.observe(words, (100 + i * 500).toLong())
            assertEquals("1.4", (state.readings["fat"] ?: state.provisional["fat"])?.printed)
            assertEquals("81.4", (state.readings["carbohydrate"] ?: state.provisional["carbohydrate"])?.printed)
        }
        val locked = reader.observe(reference, 4200)
        assertEquals("1.4", locked.readings["fat"]?.printed)
        assertEquals("81.4", locked.readings["carbohydrate"]?.printed)
    }

    @Test fun missingTargetPer100ValueNeverUsesAdjacentSubrowOrServing() {
        val reader = LiveLabelInterpreter()
        val incomplete = table(proteinPer100 = "")
        for ((i, dx) in listOf(0, 45, 90, 135, 180, 225).withIndex()) {
            val shifted = incomplete.map { it.copy(x = it.x + dx) }
            val state = reader.observe(shifted, (100 + i * 400).toLong())
            assertFalse(state.provisional.containsKey("protein"))
            assertFalse(state.readings.containsKey("protein"))
        }
    }

}
