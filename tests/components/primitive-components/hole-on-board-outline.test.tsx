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
      
      {/* Hole on the corner - should be clipped */}
      <hole diameter="2mm" pcbX={5} pcbY={5} />
      
      {/* Hole completely outside board - should be removed */}
      <hole diameter="2mm" pcbX={8} pcbY={8} />
    </board>,
  )

  circuit.render()

  const pcbHoles = circuit.db.pcb_hole.list()
  const pcbCutouts = circuit.db.pcb_cutout.list()
  
  // Expect: 1 hole inside + 3 cutouts from clipped holes = 4 total elements
  // The hole completely outside should be removed entirely
  expect(pcbHoles.length).toBe(1) // Only the hole completely inside
  expect(pcbCutouts.length).toBe(3) // Three clipped holes converted to cutouts
  expect(pcbHoles.length + pcbCutouts.length).toBe(4)

  expect(circuit).toMatchPcbSnapshot(import.meta.path)
})
