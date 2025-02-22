import { test, expect } from "bun:test"
import { Circuit } from "lib"

test("trace port selector validation for component ports", () => {
  const circuit = new Circuit()

  expect(() => {
    const UsbC = {
      name: "J1",
      GND1: {
        getPortSelector: () => ".J1 > .GND1",
      },
      // GND: undefined,
    }

    circuit.add(
      <group>
        <net name="GND" />
        {/* This should fail because UsbC.GND is undefined */}
        <trace from={UsbC.GND} to="net.GND" />
      </group>,
    )
  }).toThrowError(
    "Cannot read properties of undefined (reading 'getPortSelector')",
  )
})
