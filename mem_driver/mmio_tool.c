#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/mman.h>
#include <errno.h>

#define PAGE_SIZE 4096UL

int main(int argc, char *argv[]) {
    if (argc < 3) {
        printf("Usage:\n");
        printf("  Read: %s r <phys_addr_hex> <size_hex>\n", argv[0]);
        printf("  Write: %s w <phys_addr_hex> <value_hex>\n", argv[0]);
        return 1;
    }

    char mode = argv[1][0];
    if (mode != 'r' && mode != 'w') {
        fprintf(stderr, "Invalid mode '%c'. Use 'r' for read or 'w' for write.\n", mode);
        return 1;
    }

    uint64_t phys_addr = strtoull(argv[2], NULL, 16);
    uint64_t aligned_phys = phys_addr & ~(PAGE_SIZE - 1);
    uint64_t offset_in_page = phys_addr - aligned_phys;

    uint64_t size = 0, mmap_size = 0;
    uint32_t write_value = 0;

    if (mode == 'r') {
        if (argc != 4) {
            fprintf(stderr, "Read mode requires size parameter\n");
            return 1;
        }
        size = strtoull(argv[3], NULL, 16);
        if ((size % 4) != 0) {
            fprintf(stderr, "Read size must be multiple of 4 bytes\n");
            return 1;
        }
        // Adjust mmap size to include offset in page
        size += offset_in_page;
        mmap_size = (size + PAGE_SIZE - 1) & ~(PAGE_SIZE - 1); // Round up to full page
    } else {
        if (argc != 4) {
            fprintf(stderr, "Write mode requires value parameter\n");
            return 1;
        }
        unsigned long long val = strtoull(argv[3], NULL, 16);
        if (val > 0xFFFFFFFF) {
            fprintf(stderr, "Write value must not exceed 4 bytes (0xFFFFFFFF)\n");
            return 1;
        }
        write_value = (uint32_t)val;
        mmap_size = PAGE_SIZE; // At least one page for writing
    }

    int fd = open("/dev/mmio_dynamic", O_RDWR);
    if (fd < 0) {
        perror("open");
        return 1;
    }

    printf("Mapping physical address 0x%llx (aligned to 0x%llx), size 0x%llx\n",
           phys_addr, aligned_phys, mmap_size);

    void *map = mmap(NULL, mmap_size,
                     (mode == 'r') ? PROT_READ : (PROT_READ | PROT_WRITE),
                     MAP_SHARED, fd, aligned_phys);
    if (map == MAP_FAILED) {
        perror("mmap");
        close(fd);
        return 1;
    }

    volatile uint32_t *reg = (volatile uint32_t *)((uint8_t *)map + offset_in_page);

    if (mode == 'r') {
        for (uint64_t i = 0; i < (size - offset_in_page) / sizeof(uint32_t); i++) {
            printf("Read [0x%llx]: 0x%08x\n", phys_addr + i * 4, reg[i]);
        }
    } else {
        *reg = write_value;
        printf("Wrote 0x%08x to [0x%llx]\n", write_value, phys_addr);
    }

    munmap(map, size);
    close(fd);
    return 0;
}
