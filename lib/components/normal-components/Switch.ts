import { switchProps } from "@tscircuit/props"
import { NormalComponent } from "../base-components/NormalComponent/NormalComponent"
import type { BaseSymbolName } from "lib/utils/constants"

export class Switch extends NormalComponent<typeof switchProps> {
  private _getSwitchType(): "spst" | "spdt" | "dpst" | "dpdt" {
    const { spst, spdt, dpst, dpdt, type } = this._parsedProps ?? {}

    if (dpdt) return "dpdt"
    if (spst) return "spst"
    if (spdt) return "spdt"
    if (dpst) return "dpst"
    return type ?? "spst"
  }

  get config() {
    const switchType = this._getSwitchType()

    const baseSymbolNameMap = {
      spst: "SPST_switch",
      spdt: "SPDT_switch",
      dpst: "dpst_switch",
      dpdt: "dpdt_switch",
    }

    const symbolName = baseSymbolNameMap[switchType] ?? "SPST_switch"

    return {
      componentName: "Switch",
      schematicSymbolName: symbolName as BaseSymbolName,
      zodProps: switchProps,
      shouldRenderAsSchematicBox: false,
    }
  }

  doInitialSourceRender() {
    const { db } = this.root!
    const { _parsedProps: props } = this

    const source_component = db.source_component.insert({
      ftype: "simple_switch",
      name: props.name,
      switch_type: props.type,
      is_normally_closed: props.isNormallyClosed ?? false,
    } as any)

    this.source_component_id = source_component.source_component_id
  }
}
