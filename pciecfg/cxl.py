
import json
from typing import List
from common import CapabilityStructure, Register

def build_cxl_cache_mem_capability_from_json(
    bar_space: bytes,
    filename: str = 'pciecfg/reg_json/cxl_reg_3_2.json'
) -> List[CapabilityStructure]:
    with open(filename, 'r', encoding='utf-8') as f:
        json_data = json.load(f)

    structure_data = json_data.get("structure", {})
    register_defs = json_data.get("register", {})
    reg_type = 'cxl_cache_mem'

    # 解析 Header
    if len(bar_space) < 4:
        raise ValueError("Config space too small for CXL Capability Header")

    header = bar_space[:4]
    cxl_cap_id = int.from_bytes(header[:2], 'little')
    cxl_cap_version = (header[2] >> 0) & 0xF
    cxl_cachemem_version = (header[2] >> 4) & 0xF
    array_size = header[3]
    
    if cxl_cap_id != 0x0001:
        raise ValueError(f"CXL Capability ID is not 0x0001: {cxl_cap_id}")

    structures = []
    
    # 遍历 array 中的 Capability Headers，每个4字节，从 offset = 0x04 开始
    for i in range(array_size):
        offset = 0x04 + i * 4
        if offset + 4 > len(bar_space): 
            break
        
        cap_raw = bar_space[offset:offset + 4]
        cap_value = int.from_bytes(cap_raw, 'little')

        cap_id = cap_value & 0xFFFF                         # 0-15 bits
        cap_version = (cap_value >> 16) & 0xF               # 16-19 bits (4 bits)
        cap_pointer = (cap_value >> 20) & 0xFFF         # 20-31 bits (12 bits)
        print(f"cap_id: {cap_id}, cap_version: {cap_version}, cap_pointer: {cap_pointer}")
        matched_struct = None
        for struct_name, struct_info in structure_data.items(): 
            info = struct_info.get("info", {})
            if info.get("cap_id") == cap_id:
                matched_struct = (struct_name, struct_info)
                break

        if matched_struct:
            struct_name, struct_info = matched_struct
            registers = struct_info.get("registers", [])
        else:
            struct_name = f"UnknownStructure_{cap_id:#x}"       
            registers = []

        cap_raw = bar_space[offset - 4 + cap_pointer:]
        cap_struct = CapabilityStructure(
            name=struct_name,
            cap_id=cap_id,
            offset=offset - 4 + cap_pointer,
            size=4, 
            raw=cap_raw
        )

        for reg_name in registers:
            if reg_name not in register_defs:
                raise ValueError(f"Register definition not found: {reg_name}")

            reg_json = register_defs[reg_name]

            reg = Register(
                reg_type=reg_type,
                reg_name=reg_name,
                reg_json=reg_json,
                config_space=cap_raw, 
            )
            cap_struct.add_register(reg)

        cap_struct.finalize_raw_data()
        structures.append(cap_struct)

    return structures



if __name__ == "__main__":
    with open("pciecfg/mock_data/cxl_bar.bin", "rb") as f:
        cxl_dev_bar_space = bytearray(f.read())
        structures = build_cxl_cache_mem_capability_from_json(cxl_dev_bar_space)
        for structure in structures:
            print(structure)