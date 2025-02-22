interface Port {
  getPortSelector: () => string
}

interface Component {
  name: string
  GND: Port
  VCC?: Port
  [key: string]: any
}

const useRP2040 = (name: string): Component => {
  return {
    name,
    GND: {
      getPortSelector: () => `.${name} > .GND`,
    },
    VCC: {
      getPortSelector: () => `.${name} > .VCC`,
    },
  }
}

const useUsbC = (name: string): Component => {
  return {
    name,
    GND: {
      getPortSelector: () => `.${name} > .GND`,
    },
    VCC: {
      getPortSelector: () => `.${name} > .VCC`,
    },
  }
}

const RP2040Component = (props: { pcbY: number }) => {
  const RP2040 = useRP2040("U1")
  return <div className={`RP2040`} style={{ top: props.pcbY }} />
}

const USBCComponent = (props: { schX: number; pcbY: number }) => {
  const USBC = useUsbC("J1")
  return (
    <div className={`USBC`} style={{ left: props.schX, top: props.pcbY }} />
  )
}

export const RP2040Module = (props: { name: string }) => {
  const RP2040 = useRP2040("U1")
  const USBC = useUsbC("J1")

  return (
    <group>
      <RP2040Component pcbY={8} />
      <USBCComponent schX={-6} pcbY={-8} />

      <trace from={USBC.GND} to="net.GND" />
      <trace from={RP2040.GND} to="net.GND" />
    </group>
  )
}
