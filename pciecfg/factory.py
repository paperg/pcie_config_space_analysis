



class PCIeRegisterFactory:
    def __init__(self, config_space: bytes):
        self.config_space = config_space

    def get_register(self, key):
        if isinstance(key, str):
            reg_cls = PCIeRegister.registry_by_name.get(key.lower())
        elif isinstance(key, int):
            reg_cls = PCIeRegister.registry_by_offset.get(key)
        else:
            raise TypeError("Key must be str or int")
        if not reg_cls:
            raise ValueError(f"No register found for key: {key}")
        return reg_cls(self.config_space)

    def parse_all_standard(self):
        result = {}
        for name, cls in PCIeRegister.registry_by_name.items():
            if getattr(cls, 'type', 'standard') == 'standard':
                result[name] = cls(self.config_space)

        return result

    def parse_capabilities(self):
        return parse_standard_capabilities(self.config_space)

    def parse_extended_caps(self):
        return parse_extended_capabilities(self.config_space)