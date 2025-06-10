
#include <linux/init.h>
#include <linux/module.h>
#include <linux/fs.h>
#include <linux/miscdevice.h>
#include <linux/uaccess.h>
#include <linux/io.h>
#include <linux/mm.h>

#define DEVICE_NAME "mmio_dynamic"

static int mmio_mmap(struct file *filp, struct vm_area_struct *vma)
{
    unsigned long requested_size = vma->vm_end - vma->vm_start;
    phys_addr_t phys = (phys_addr_t)vma->vm_pgoff << PAGE_SHIFT;

    pr_info("mmio_dynamic: mmap phys=0x%llx, size=0x%lx\n",
            (unsigned long long)phys, requested_size);

    vma->vm_page_prot = pgprot_noncached(vma->vm_page_prot);

    if (remap_pfn_range(vma, vma->vm_start,
                        phys >> PAGE_SHIFT,
                        requested_size,
                        vma->vm_page_prot)) {
        pr_err("mmio_dynamic: remap_pfn_range failed\n");
        return -EAGAIN;
    }

    return 0;
}

static const struct file_operations mmio_fops = {
    .owner = THIS_MODULE,
    .mmap  = mmio_mmap,
};

static struct miscdevice mmio_dev = {
    .minor = MISC_DYNAMIC_MINOR,
    .name  = DEVICE_NAME,
    .fops  = &mmio_fops,
    .mode  = 0666,
};

static int __init mmio_init(void)
{
    pr_info("mmio_dynamic: loaded\n");
    return misc_register(&mmio_dev);
}

static void __exit mmio_exit(void)
{
    misc_deregister(&mmio_dev);
    pr_info("mmio_dynamic: unloaded\n");
}

MODULE_LICENSE("GPL");
MODULE_AUTHOR("GuoPeng");
MODULE_DESCRIPTION("Dynamic MMIO Mapping Driver");

module_init(mmio_init);
module_exit(mmio_exit);

