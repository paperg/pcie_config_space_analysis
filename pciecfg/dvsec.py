
from common import CapabilityStructure, Register


def parse_dvsec_structure(cap_struct, reg_list, dvsec_json_data, raw) -> CapabilityStructure:

    register_defs = dvsec_json_data.get("register", {})
    if register_defs is None:
        raise ValueError("Register definition not found")
    
    length = cap_struct.get_field_value("dvsec_length")
    cur_length = max(r.offset + r.size for r in cap_struct.registers)
    
    for reg_name in reg_list:
        reg_json = register_defs.get(reg_name)
        if reg_json is None:
            raise ValueError(f"Register definition not found: {reg_name}")

        if reg_json.get("offset") == "varies":
            reg_json["offset"] = cur_length

        reg = Register(
            reg_type="pcie_extended",
            reg_name=reg_name,
            reg_json=reg_json,
            config_space=raw,
        )
        cap_struct.add_register(reg)
        cur_length += reg_json.get("size")

    block_num = 2
    vairs_reg_list_pos = 0
    vairs_reg_list = None
    json_key_name = None

    while cur_length < length:
        if vairs_reg_list is None:
            # "dvsec_register_locator_varies": {
            #     "prefix": "register_block_",
            #     "registers": ["register_offset_low", "register_offset_high"]
            # },
            
            json_key_name = register_defs.get(cap_struct.name + "_varies")
            if json_key_name is None:
                raise ValueError(f"Register definition not found: {cap_struct.name}_varies")

            vairs_reg_list = json_key_name.get("registers")
    
        key_reg_name = json_key_name.get('registers')[vairs_reg_list_pos]
        reg_name = json_key_name.get("prefix") + str(block_num) + "_" + key_reg_name
        reg_json = register_defs.get(key_reg_name)
        reg_json["offset"] = cur_length
        reg = Register(
            reg_type="pcie_extended",
            reg_name=reg_name,
            reg_json=reg_json,
            config_space=raw,
        )
        cap_struct.add_register(reg)
        cur_length += reg_json.get("size", 4)
        vairs_reg_list_pos += 1
        if vairs_reg_list_pos >= len(vairs_reg_list):
            vairs_reg_list_pos = 0
            block_num += 1
        
    return cap_struct
