document.addEventListener('DOMContentLoaded', () => {
    const dataContainer = document.getElementById('data-container');
    const loadingIndicator = document.getElementById('loading');
    const regions = document.querySelectorAll('.region');

    // 格式化地址为8位十六进制
    const formatAddress = (address) => {
        return address.toString(16).padStart(8, '0').toUpperCase();
    };

    // 格式化字节为2位十六进制
    const formatByte = (byte) => {
        return byte.toString(16).padStart(2, '0').toUpperCase();
    };

    // 创建数据行
    const createDataRow = (address, bytes) => {
        const row = document.createElement('div');
        row.className = 'data-row';

        const addressSpan = document.createElement('span');
        addressSpan.className = 'address';
        addressSpan.textContent = `${formatAddress(address)}:`;

        const bytesDiv = document.createElement('div');
        bytesDiv.className = 'bytes';

        bytes.forEach(byte => {
            const byteSpan = document.createElement('span');
            byteSpan.className = 'byte';
            byteSpan.textContent = formatByte(byte);
            bytesDiv.appendChild(byteSpan);
        });

        row.appendChild(addressSpan);
        row.appendChild(bytesDiv);
        return row;
    };

    // 显示内存数据
    const displayMemoryData = (data) => {
        dataContainer.innerHTML = '';
        for (let i = 0; i < data.length; i += 16) {
            const rowData = data.slice(i, i + 16);
            const row = createDataRow(i, rowData);
            dataContainer.appendChild(row);
        }
    };

    // 处理区域点击事件
    const handleRegionClick = async (region) => {
        try {
            loadingIndicator.style.display = 'flex';
            dataContainer.innerHTML = '';

            const response = await fetch(`/api/memory/${region}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            displayMemoryData(data);
        } catch (error) {
            console.error('Error fetching memory data:', error);
            dataContainer.innerHTML = `<div class="error">Error loading data: ${error.message}</div>`;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    };

    // 为每个区域添加点击事件监听器
    regions.forEach(region => {
        region.addEventListener('click', () => {
            const regionType = region.dataset.region;
            handleRegionClick(regionType);
        });
    });
});