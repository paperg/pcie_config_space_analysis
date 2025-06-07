


# 读入配置空间二进制数据
with open("config_space.bin", "rb") as f:
    config_space = f.read()

# 从 JSON 文件批量创建寄存器对象
registers = Register.from_file("reg_6_2.json", config_space)

for reg in registers:
    print(reg.debug())
