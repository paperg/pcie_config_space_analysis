



import json
from common import Register
from typing import List, Dict


def load_pci_registers_from_json(config_space: bytes) -> List[Register]:
    """
    读取指定 JSON 文件，解析其中 pci 类型的寄存器，并用配置空间 bytes 初始化 Register 对象列表。
    
    假设 JSON 结构为：
    {
        "register": {
            "command": {
                "offset": 0,
                "size": 8,
                "type": "pci",
                "fields": [ ... ]
            },
            "status": {
                ...
            }
        }
    }
    """
    with open('pciecfg/reg_json/pci_reg_6_2.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    regs = []
    register_dict = data.get("register", {})
    for reg_name, reg_json in register_dict.items():
        reg = Register('pci', reg_name, reg_json, config_space)
        regs.append(reg)
            
    return regs


with open("pciecfg/config_space.bin", "rb") as f:
    config_space = bytearray(f.read())
    regs = load_pci_registers_from_json(config_space)
    print(regs)
    