import { test, expect } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("Hole on board outline should be clipped in snapshots", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      {/* Hole completely inside board */}
      <hole diameter="2mm" pcbX={0} pcbY={0} />
      
      {/* Hole on the right edge - should be clipped */}
      <hole diameter="2mm" pcbX={5} pcbY={0} />
            
      {/* Hole on the top edge - should be clipped */}
      <hole diameter="2mm" pcbX={0} pcbY={5} />
      
      {/* Hole completely outside board - should be kept as hole */}
      <hole diameter="2mm" pcbX={8} pcbY={8} />
    </board>,
  )

  circuit.render()

  const pcbHoles = circuit.db.pcb_hole.list()
  const pcbCutouts = circuit.db.pcb_cutout.list()
  
  // Expect: 2 holes (inside + outside) + 2 cutouts from clipped holes = 4 total elements
  // The hole completely outside should be kept as-is
  expect(pcbHoles.length).toBe(2) // Hole inside + hole outside
  expect(pcbCutouts.length).toBe(2) // Two clipped holes converted to cutouts
  expect(pcbHoles.length + pcbCutouts.length).toBe(4)

  expect(circuit).toMatchPcbSnapshot(import.meta.path)
})
