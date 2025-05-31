/****/
$(document).ready(function () {
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

    // 更新registerName位置的函数
    function updateRegisterNamePosition() {
        const registerName = $('.register-name');
        const bitBoxContainers = $('.bit-box-container');
        if (bitBoxContainers.length > 0) {
            // 使用getBoundingClientRect替代getComputedStyle以获得更准确的位置
            const boxRect = bitBoxContainers[0].getBoundingClientRect();
            const boxWidth = boxRect.width;
            console.log("boxWidth", boxWidth);
            // 获取当前html的fontSize
            const htmlFontSize = parseFloat($('html').css('fontSize'));
            // 将px转换为rem
            const boxWidthRem = boxWidth / htmlFontSize;
            const leftPositionRem = boxWidthRem * (bitBoxContainers.length + 2);
            registerName.css('left', `${leftPositionRem}rem`);
            console.log("boxWidthRem", boxWidthRem, "leftPositionRem", leftPositionRem);
        }
    }

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
        console.log("resize handling");
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
        console.log("resize event triggered");
        debouncedResize();
    });

    // 计算坐标并画线
    function calculateCoordinates() {
        const boxes = $('.bit-box');
        const names = $('.bit-name');
        const svg = $('#svg-line');
        const svgRect = svg[0].getBoundingClientRect(); // 获取SVG的位置

        // 清空之前的线
        svg.empty();

        boxes.each(function (index) {
            const box = $(this);
            const name = names.eq(index);

            // 获取box的位置和尺寸
            const boxRect = box[0].getBoundingClientRect();
            const nameRect = name[0].getBoundingClientRect();
            const registerRect = $('.register')[0].getBoundingClientRect();

            // 计算相对于SVG的坐标
            const startX = boxRect.left - registerRect.left + boxRect.width / 2;
            const startY = boxRect.top - registerRect.top + boxRect.height;
            const endX = nameRect.left - registerRect.left;
            const endY = nameRect.top - registerRect.top + nameRect.height / 2;

            // console.log("index", index, "startX", startX, "startY", startY, "endX", endX, "endY", endY);
            const lineClass = box.text() == "1" ? "line-dashed" : "line";

            // 创建垂直线
            const vPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const vd = `M ${startX} ${startY} V ${endY}`;
            vPath.setAttribute("d", vd);
            vPath.setAttribute("class", lineClass);
            svg.append(vPath);

            // 创建水平线
            const hPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const hd = `M ${startX} ${endY} H ${endX}`;
            hPath.setAttribute("d", hd);
            hPath.setAttribute("class", lineClass);
            svg.append(hPath);
        });
    }

    // 生成bit-box和bit-name
    function generateRegisterBits(bitCount, bitDescriptions = {}) {
        const registerBox = $('.register-box');
        const registerName = $('.register-name');

        // 清空现有内容
        registerBox.empty();
        registerName.empty();

        // 生成bit-box和bit-name
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
                    'font-size': '0.12rem',
                    'margin-bottom': '0.02rem',
                    'user-select': 'none'
                })
                .text(i); // 从31到0显示

            // 创建bit-box
            const bitBox = $('<div>')
                .addClass('bit-box')
                .attr('contenteditable', 'false')
                .attr('data-bit', i)
                .text('0');

            // 创建bit-name，使用传入的描述或默认值
            const bitDescription = bitDescriptions[i] || `bit${i}`;
            const bitName = $('<span>')
                .addClass('bit-name')
                .attr('contenteditable', 'false')
                .attr('data-bit', i)
                .text(bitDescription);

            // 将bit编号和bit-box添加到容器中
            bitBoxContainer.append(bitNumber, bitBox);

            // 添加到DOM
            registerBox.append(bitBoxContainer);
            registerName.append(bitName);
        }

        // 设置registerName位置
        updateRegisterNamePosition();
    }

    // 更新寄存器显示
    function updateRegister(registerValue, bitCount, bitDescriptions = {}) {
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

        // 重新生成bit-box和bit-name
        generateRegisterBits(bitCount, bitDescriptions);

        // 获取所有bit-box和bit-name元素
        const boxes = $('.bit-box');
        const names = $('.bit-name');

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

            // 更新bit-name
            if (names[i]) {
                const description = bitDescriptions[i] || `bit${i}`;
                names[i].textContent = description;
            }
        }

        // 重新计算连接线
        calculateCoordinates();
    }

    // 示例：更新寄存器的函数
    function setRegisterValue(value, bitCount = 32, bitDescriptions = {}) {
        updateRegister(value, bitCount, bitDescriptions);
    }

    // 测试函数：随机更新寄存器值
    function startRandomTest(bitCount = 32, bitDescriptions = {}) {
        // 清除可能存在的旧定时器
        if (window.randomTestInterval) {
            clearInterval(window.randomTestInterval);
        }

        // 每2秒更新一次随机值
        window.randomTestInterval = setInterval(() => {
            const maxValue = Math.pow(2, bitCount) - 1;
            const randomValue = Math.floor(Math.random() * maxValue);
            console.log('New random value:', randomValue.toString(16)); // 以16进制显示
            setRegisterValue(randomValue, bitCount, bitDescriptions);
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
        // 示例1：8位寄存器，带位描述
        const bitDescriptions8 = {
            0: "Enable",
            1: "Interrupt",
            2: "Mode",
            3: "Status",
            4: "Error",
            5: "Busy",
            6: "Ready",
            7: "Valid"
        };
        // setRegisterValue(0xA5, 8, bitDescriptions8); // 设置8位值 10100101

        // 示例2：16位寄存器，带位描述
        const bitDescriptions16 = {
            0: "Enable",
            1: "Interrupt",
            2: "Mode",
            3: "Status",
            4: "Error",
            5: "Busy",
            6: "Ready",
            7: "Valid",
            8: "Power",
            9: "Clock",
            10: "Reset",
            11: "Test",
            12: "Debug",
            13: "Trace",
            14: "Monitor",
            15: "Control"
        };
        // setRegisterValue(0x1234, 16, bitDescriptions16); // 设置16位值

        // 示例3：32位寄存器，带位描述
        const bitDescriptions32 = {
            0: "Enablesdadsadasdasdsddasdsdasdasdasdasdsadsd",
            1: "Interrupt",
            2: "Mode",
            3: "Status",
            4: "Error",
            5: "Busy",
            6: "Ready",
            7: "Valid",
            8: "Power",
            9: "Clock",
            10: "Reset",
            11: "Test",
            12: "Debug",
            13: "Trace",
            14: "Monitor",
            15: "Control",
            16: "Data[0]",
            17: "Data[1]",
            18: "Data[2]",
            19: "Data[3]",
            20: "Data[4]",
            21: "Data[5]",
            22: "Data[6]",
            23: "Data[7]",
            24: "Addr[0]",
            25: "Addr[1]",
            26: "Addr[2]",
            27: "Addr[3]",
            28: "Addr[4]",
            29: "Addr[5]",
            30: "Addr[6]",
            31: "Addr[7]"
        };
        setRegisterValue(0x12345678, 32, bitDescriptions32); // 设置32位值

        // 启动随机测试（取消注释以启用）
        // startRandomTest(8, bitDescriptions8);  // 8位随机测试
        // startRandomTest(16, bitDescriptions16);  // 16位随机测试
        // startRandomTest(32, bitDescriptions32);  // 32位随机测试
    }

    // 执行测试
    runTest();
});