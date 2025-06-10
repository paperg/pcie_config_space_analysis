obj-m += mmio_dynamic.o

all:
	make -C /lib/modules/$(shell uname -r)/build M=$(PWD) modules
	gcc mmio_tool.c -o mmio_tool

clean:
	make -C /lib/modules/$(shell uname -r)/build M=$(PWD) clean
	rm mmio_tool


