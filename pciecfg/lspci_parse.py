import subprocess
import re

def parse_pcie_devices():
    result = subprocess.run(['lspci'], stdout=subprocess.PIPE, text=True)
    lines = result.stdout.strip().split('\n')
    
    devices = []
    
    for line in lines:

        m = re.match(r'^([0-9a-fA-F]{2}:[0-9a-fA-F]{2}\.[0-9a-fA-F]) (.+)$', line)
        if m:
            bdf = m.group(1)
            name = m.group(2)
            
            devices.append((bdf, name))
    
    return devices

if __name__ == "__main__":
    pcie_devices = parse_pcie_devices()
    for bdf, name in pcie_devices:
        print(f"{bdf} {name}")
