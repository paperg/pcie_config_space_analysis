/****/
$(document).ready(function () {
    // 全局变量声明
    let currentRegisterValue = 0;
    let isValueModified = false;
    let currentBitRanges = {};
    let currentBitCount = 32;
    let currentRegisterInfo = {};

    console.log("ready")
    var whei = $(window).width()
    $("html").css({
        fontSize: whei / 20
    })

    // 主题切换功能
    const themeToggle = $('#themeToggle');

    // 检查本地存储中的主题设置
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        $('body').addClass('dark-theme');
    }

    // 主题切换按钮点击事件
    themeToggle.on('click', function () {
        const body = $('body');
        if (body.hasClass('dark-theme')) {
            body.removeClass('dark-theme');
            localStorage.setItem('theme', 'light');
        } else {
            body.addClass('dark-theme');
            localStorage.setItem('theme', 'dark');
        }
    });

    // 添加防抖函数
    function debounce(func, wait) {
        let timeout;
        return function () {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }

    // 处理resize的函数
    function handleResize() {
        var whei = $(window).width();
        $("html").css({
            fontSize: whei / 20
        });

        // 强制重排
        $('.register').hide().show(0);

        // 重新计算坐标
        calculateCoordinates();
    }

    // 使用防抖处理resize事件
    const debouncedResize = debounce(handleResize, 100);

    $(window).resize(function () {
        debouncedResize();
    });

    // 计算坐标并画线
    function calculateCoordinates() {
        const boxes = $('.bit-box');
        const fieldNames = $('.bit-name');
        const svg = $('#svg-line');
        const svgRect = svg[0].getBoundingClientRect();
        const registerRect = $('.register')[0].getBoundingClientRect();

        // 清空之前的线
        svg.empty();

        // 获取所有位域的范围
        const fieldRanges = [];
        fieldNames.each(function () {
            const start = parseInt($(this).attr('data-field-start'));
            const end = parseInt($(this).attr('data-field-end'));
            fieldRanges.push({
                start,
                end,
                element: this
            });
        });

        // 为每个位域创建连接线
        fieldRanges.forEach(({
            start,
            end,
            element
        }) => {
            // 获取位域的第一个和最后一个box（注意：end是较小的数字，start是较大的数字）
            const firstBox = boxes.eq(end); // bit-box 0
            const lastBox = boxes.eq(start); // bit-box 7
            const fieldName = $(element);

            if (firstBox.length && lastBox.length && fieldName.length) {
                // 获取box的位置和尺寸
                const firstBoxRect = firstBox[0].getBoundingClientRect();
                const lastBoxRect = lastBox[0].getBoundingClientRect();
                const nameRect = fieldName[0].getBoundingClientRect();

                // 计算左右两边垂直线的起点（box下边沿的中点）
                const leftX = lastBoxRect.left - registerRect.left + lastBoxRect.width / 2;
                const rightX = firstBoxRect.left - registerRect.left + firstBoxRect.width / 2;
                const startY = firstBoxRect.top - registerRect.top + firstBoxRect.height;

                // 计算连接线的终点坐标
                const nameX = nameRect.left - registerRect.left;
                const nameY = nameRect.top - registerRect.top + nameRect.height / 2;
                const vLineEndY = startY + 20;

                // 获取位域的值（使用最高位的值来决定线的样式）
                const highBitValue = (parseInt($('.register-box').attr('data-value') || '0') >> start) & 1;
                const lineClass = highBitValue ? "line-dashed" : "line";

                // 创建左垂直线
                const leftVLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
                const leftVLineD = `M ${leftX} ${startY} V ${vLineEndY}`;
                leftVLine.setAttribute("d", leftVLineD);
                leftVLine.setAttribute("class", lineClass);
                svg.append(leftVLine);

                // 创建右垂直线
                const rightVLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
                const rightVLineD = `M ${rightX} ${startY} V ${vLineEndY}`;
                rightVLine.setAttribute("d", rightVLineD);
                rightVLine.setAttribute("class", lineClass);
                svg.append(rightVLine);

                // 连接左右垂直线
                const hLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
                const hLineD = `M ${leftX} ${vLineEndY} H ${rightX}`;
                hLine.setAttribute("d", hLineD);
                hLine.setAttribute("class", lineClass);
                svg.append(hLine);

                // 中点起始 svg 画垂直线
                const midStartX = (leftX + rightX) / 2;
                const midLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
                const midLineD = `M ${midStartX} ${vLineEndY} V ${nameY}`;
                midLine.setAttribute("d", midLineD);
                midLine.setAttribute("class", lineClass);
                svg.append(midLine);

                // 创建水平连接线（从两条垂直线的中点开始）
                const hPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                const hd = `M ${midStartX} ${nameY} H ${nameX}`;
                hPath.setAttribute("d", hd);
                hPath.setAttribute("class", lineClass);
                svg.append(hPath);
            }
        });
    }

    // 更新位描述列表
    function updateBitDescriptions(bitRanges, registerValue) {
        const descriptionList = $('#bit-description-list');
        descriptionList.empty();

        // 按位范围升序排序（低位在前）
        const sortedRanges = Object.entries(bitRanges).sort((a, b) => {
            const [startA] = a[0].split('-').map(Number);
            const [startB] = b[0].split('-').map(Number);
            return startA - startB; // 升序排列
        });

        sortedRanges.forEach(([range, info]) => {
            const [start, end] = range.split('-').map(Number);
            // 计算位域的值：从寄存器值中提取对应位域的值
            const fieldWidth = start - end + 1;
            const fieldValue = (registerValue >> end) & ((1 << fieldWidth) - 1);
            const hexWidth = Math.ceil(fieldWidth / 4); // 计算需要的十六进制位数

            const item = $('<div>')
                .addClass('bit-description-item')
                .attr('id', `bit-field-${start}-${end}`)
                .append(
                    $('<span>')
                    .addClass('bit-range')
                    .text(`[${start}:${end}]`),
                    $('<span>')
                    .addClass('bit-field')
                    .html(`${info.field || ''}`),
                    $('<span>')
                    .addClass('bit-value')
                    .text(`0x${fieldValue.toString(16).toUpperCase().padStart(hexWidth, '0')}`),
                    $('<span>')
                    .addClass('bit-default')
                    .text(`0x${info.default.toString(16).toUpperCase().padStart(hexWidth, '0')}`),
                    $('<span>')
                    .addClass('bit-description')
                    .text(info.description),
                    $('<span>')
                    .addClass('bit-attributes')
                    .text(info.attributes.join(', '))
                );
            descriptionList.append(item);
        });
    }

    // 生成bit-box和bit-name
    function generateRegisterBits(bitCount, bitRanges = {}) {
        const registerBox = $('.register-box');
        const registerName = $('.register-name');

        // 清空现有内容
        registerBox.empty();
        registerName.empty();

        // 创建位域映射和位域范围数组
        const bitFieldMap = new Map();
        const fieldRanges = [];
        Object.entries(bitRanges).forEach(([range, info]) => {
            const [start, end] = range.split('-').map(Number);
            fieldRanges.push({
                start,
                end,
                field: info.field || ''
            });
            for (let i = start; i <= end; i++) {
                bitFieldMap.set(i, info.field || '');
            }
        });

        // 按起始位升序排序位域（低位在前）
        fieldRanges.sort((a, b) => a.start - b.start);

        // 生成bit-box
        for (let i = 0; i < bitCount; i++) {
            // 创建bit-box容器
            const bitBoxContainer = $('<div>')
                .addClass('bit-box-container')
                .css({
                    'display': 'flex',
                    'flex-direction': 'column',
                    'align-items': 'center',
                    'margin': '0.01rem'
                });

            // 创建bit编号标签
            const bitNumber = $('<div>')
                .addClass('bit-number')
                .css({
                    'font-size': '0.16rem',
                    'margin-bottom': '0.02rem',
                    'user-select': 'none'
                })
                .text(i);

            // 创建bit-box
            const bitBox = $('<div>')
                .addClass('bit-box')
                .attr('data-bit', i)
                .text('0')
                .on('click', function () {
                    const bitIndex = $(this).data('bit');
                    const currentBitValue = $(this).hasClass('bit-1');
                    const newBitValue = !currentBitValue;

                    // Update bit box appearance
                    $(this).removeClass('bit-0 bit-1')
                        .addClass(newBitValue ? 'bit-1' : 'bit-0')
                        .text(newBitValue ? '1' : '0');

                    // Update register value
                    if (newBitValue) {
                        currentRegisterValue |= (1 << bitIndex);
                    } else {
                        currentRegisterValue &= ~(1 << bitIndex);
                    }

                    // Update display
                    updateRegisterValueDisplay(currentRegisterValue);
                    isValueModified = true;

                    // Update bit descriptions
                    updateBitDescriptions(currentBitRanges, currentRegisterValue);

                    // Update bit values in descriptions
                    updateBitDescriptionValue(bitIndex, newBitValue);
                });

            // 添加鼠标悬停事件
            bitBox.on('mouseenter', function () {
                // 找到包含当前bit的所有位域
                fieldRanges.forEach(({
                    start,
                    end,
                    field
                }) => {
                    if (i >= end && i <= start) {
                        // 找到对应的位域名称元素并高亮
                        $(`.bit-name[data-field-start="${start}"][data-field-end="${end}"]`).addClass('highlight');
                    }
                });
            }).on('mouseleave', function () {
                // 移除所有位域名称的高亮
                $('.bit-name').removeClass('highlight');
            });

            // 将bit编号和bit-box添加到容器中
            bitBoxContainer.append(bitNumber, bitBox);

            // 添加到DOM
            registerBox.append(bitBoxContainer);
        }

        // 生成位域名称（低位在上）
        fieldRanges.forEach(({
            start,
            end,
            field
        }) => {
            const fieldName = $('<span>')
                .addClass('bit-name')
                .attr('contenteditable', 'false')
                .attr('data-field-start', start)
                .attr('data-field-end', end)
                .html(`${field}`);

            // 添加鼠标悬停事件
            fieldName.on('mouseenter', function () {
                // 高亮当前位域名称
                $(this).addClass('highlight');
                // 高亮对应的所有bit-box
                for (let i = end; i <= start; i++) {
                    $(`.bit-box[data-bit="${i}"]`).addClass('highlight-box');
                }
            }).on('mouseleave', function () {
                // 移除位域名称的高亮
                $(this).removeClass('highlight');
                // 移除所有bit-box的高亮
                $('.bit-box').removeClass('highlight-box');
            }).on('click', function (e) {
                // 检查是否按下了Ctrl键
                if (e.ctrlKey) {
                    // 构建锚点ID
                    const anchorId = `bit-field-${start}-${end}`;
                    // 获取目标元素
                    const targetElement = document.getElementById(anchorId);
                    if (targetElement) {
                        // 平滑滚动到目标位置
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                        // 添加临时高亮效果
                        $(targetElement).addClass('highlight-description')
                            .delay(1000)
                            .queue(function () {
                                $(this).removeClass('highlight-description').dequeue();
                            });
                    }
                    // 阻止默认的点击行为
                    e.preventDefault();
                }
            });

            registerName.append(fieldName);
        });
    }

    // 更新寄存器显示
    function updateRegister(registerValue, bitCount, bitRanges = {}, registerInfo = {}) {
        // 更新全局变量
        currentRegisterValue = registerValue;
        currentBitRanges = bitRanges;
        currentBitCount = bitCount;
        currentRegisterInfo = registerInfo;
        isValueModified = false;

        // 确保输入是有效的整数
        if (typeof registerValue !== 'number' || registerValue < 0) {
            console.error('Invalid register value: must be a non-negative integer');
            return;
        }

        // 计算最大值
        const maxValue = Math.pow(2, bitCount) - 1;
        if (registerValue > maxValue) {
            console.error(`Invalid register value: must be less than or equal to ${maxValue}`);
            return;
        }

        // 更新寄存器信息
        if (registerInfo.name) {
            $('#register-name-value').text(registerInfo.name);
            $('.register-title').text(registerInfo.name);
        }
        if (registerInfo.offset !== undefined) {
            $('#register-offset-value').text(`0x${registerInfo.offset.toString(16).toUpperCase().padStart(4, '0')}`);
        }
        $('#register-value').text(`0x${registerValue.toString(16).toUpperCase().padStart(bitCount/4, '0')}`);

        // 存储当前值用于线段样式
        $('.register-box').attr('data-value', registerValue);

        // 重新生成bit-box和bit-name
        generateRegisterBits(bitCount, bitRanges);

        // 更新位描述列表
        updateBitDescriptions(bitRanges, registerValue);

        // 获取所有bit-box元素
        const boxes = $('.bit-box');

        // 遍历每一位
        for (let i = 0; i < bitCount; i++) {
            // 获取当前位的值 (0 或 1)
            const bitValue = (registerValue >> i) & 1;

            // 更新bit-box
            if (boxes[i]) {
                boxes[i].textContent = bitValue;
                // 根据值设置不同的样式
                boxes[i].className = `bit-box ${bitValue ? 'bit-1' : 'bit-0'}`;
            }
        }

        // 重新计算连接线
        calculateCoordinates();
    }

    // 示例：更新寄存器的函数
    function setRegisterValue(value, bitCount = 32, bitRanges = {}, registerInfo = {}) {
        updateRegister(value, bitCount, bitRanges, registerInfo);
    }

    // 测试函数：随机更新寄存器值
    function startRandomTest(bitCount = 32, bitRanges = {}, registerInfo = {}) {
        // 清除可能存在的旧定时器
        if (window.randomTestInterval) {
            clearInterval(window.randomTestInterval);
        }

        // 每2秒更新一次随机值
        window.randomTestInterval = setInterval(() => {
            const maxValue = Math.pow(2, bitCount) - 1;
            const randomValue = Math.floor(Math.random() * maxValue);
            console.log('New random value:', randomValue.toString(16)); // 以16进制显示
            setRegisterValue(randomValue, bitCount, bitRanges, registerInfo);
        }, 2000);
    }

    // 如果需要从后端获取数据，可以添加一个函数
    function fetchRegisterValue() {
        // 这里添加实际的API调用
        // 例如：
        // $.ajax({
        //     url: '/api/register',
        //     method: 'GET',
        //     success: function(response) {
        //         setRegisterValue(response.value);
        //     }
        // });
    }

    // 导出函数供外部使用
    window.setRegisterValue = setRegisterValue;
    window.fetchRegisterValue = fetchRegisterValue;
    window.startRandomTest = startRandomTest;

    // 测试用例
    function runTest() {
        // 示例：32位寄存器，带位域描述
        const bitRanges32 = {
            "31-24": {
                field: "DEVICE_ID_H",
                description: "Device ID High Byte",
                default: 0x12,
                attributes: ["RO", "Reset"]
            },
            "23-16": {
                field: "DEVICE_ID_L",
                description: "Device ID Low Byte",
                default: 0x34,
                attributes: ["RO", "Reset"]
            },
            "15-8": {
                field: "REVISION_ID",
                description: "Revision ID",
                default: 0x56,
                attributes: ["RO", "Reset"]
            },
            "7-0": {
                field: "CLASS_CODE",
                description: "Class Code",
                default: 0x78,
                attributes: ["RO", "Reset"]
            }
        };

        const registerInfo = {
            name: "Device ID Register",
            offset: 0x0000,
            description: "Device Identification Register"
        };

        setRegisterValue(0x12345678, 32, bitRanges32, registerInfo);
    }

    // 执行测试
    runTest();

    function updateRegisterValueDisplay(value) {
        const display = document.getElementById('register-value-display');
        const modifyBtn = document.getElementById('modify-register-btn');

        // Format value as hex with leading zeros
        const hexValue = '0x' + value.toString(16).padStart(8, '0').toUpperCase();
        display.textContent = hexValue;

        // Update modify button state
        if (isValueModified) {
            modifyBtn.classList.remove('disabled');
        } else {
            modifyBtn.classList.add('disabled');
        }
    }

    function updateBitDescriptionValue(bitIndex, value) {
        // 遍历所有位域
        Object.entries(currentBitRanges).forEach(([range, info]) => {
            const [start, end] = range.split('-').map(Number);
            // 检查当前位是否在这个位域范围内
            if (bitIndex >= end && bitIndex <= start) {
                const descriptionItem = document.getElementById(`bit-field-${start}-${end}`);
                if (descriptionItem) {
                    const valueElement = descriptionItem.querySelector('.bit-value');
                    if (valueElement) {
                        // 计算位域的值
                        const fieldValue = (currentRegisterValue >> end) & ((1 << (start - end + 1)) - 1);
                        // 更新显示
                        valueElement.textContent = `0x${fieldValue.toString(16).toUpperCase().padStart(Math.ceil((start - end + 1) / 4), '0')}`;
                    }
                }
            }
        });
    }

    function toggleBit(bitIndex) {
        const bitBox = $(`.bit-box[data-bit="${bitIndex}"]`);
        if (!bitBox.length) return;

        // Toggle bit value
        const currentBitValue = bitBox.hasClass('bit-1');
        const newBitValue = !currentBitValue;

        // Update bit box appearance
        bitBox.removeClass('bit-0 bit-1')
            .addClass(newBitValue ? 'bit-1' : 'bit-0')
            .text(newBitValue ? '1' : '0');

        // Update register value
        if (newBitValue) {
            currentRegisterValue |= (1 << bitIndex);
        } else {
            currentRegisterValue &= ~(1 << bitIndex);
        }

        // Update display
        updateRegisterValueDisplay(currentRegisterValue);
        isValueModified = true;

        // Update bit descriptions with new value
        updateBitDescriptions(currentBitRanges, currentRegisterValue);

        // Update bit values in descriptions
        updateBitDescriptionValue(bitIndex, newBitValue);
    }

    function applyRegisterChanges() {
        if (!isValueModified) return;

        // Here you would typically make an API call to update the register value
        // For now, we'll just log it
        console.log('Applying register changes:', {
            value: currentRegisterValue,
            hexValue: '0x' + currentRegisterValue.toString(16).padStart(8, '0').toUpperCase(),
            bitCount: currentBitCount,
            registerInfo: currentRegisterInfo
        });

        // Reset modification state
        isValueModified = false;
        updateRegisterValueDisplay(currentRegisterValue);

        // Update the register display with the new value
        updateRegister(currentRegisterValue, currentBitCount, currentBitRanges, currentRegisterInfo);
    }

    // Add event listener for modify button
    document.addEventListener('DOMContentLoaded', function () {
        const modifyBtn = document.getElementById('modify-register-btn');
        if (modifyBtn) {
            modifyBtn.addEventListener('click', applyRegisterChanges);
        }
    });
});