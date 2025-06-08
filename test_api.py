#!/usr/bin/env python3
"""
测试API接口的脚本
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
import json

def test_device_api():
    """测试设备列表API"""
    print("Testing /api/device...")
    with app.test_client() as client:
        response = client.get('/api/device')
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.get_json()
            print(f"Response: {json.dumps(data[:3], indent=2)}...")  # 只显示前3个设备
            print(f"Total devices: {len(data)}")
        else:
            print(f"Error: {response.data}")

def test_memory_region_api():
    """测试内存区域API"""
    print("\nTesting /api/memory/region...")
    with app.test_client() as client:
        response = client.get('/api/memory/region')
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.get_json()
            print("Response structure:")
            print(f"  - regions: {len(data.get('regions', []))}")
            print(f"  - registers: {len(data.get('registers', []))}")
            print(f"  - device_bdf: {data.get('device_bdf')}")
            print(f"  - raw_data length: {len(data.get('raw_data', []))}")
            
            # 显示前几个寄存器
            if data.get('registers'):
                print("\nFirst few registers:")
                for i, reg in enumerate(data['registers'][:3]):
                    print(f"  {i+1}. {reg.get('name', 'Unknown')} @ 0x{reg.get('offset', 0):02x}")
        else:
            print(f"Error: {response.data}")

def test_memory_region_with_bdf():
    """测试带BDF参数的内存区域API"""
    print("\nTesting /api/memory/region?bdf=15:00.0...")
    with app.test_client() as client:
        response = client.get('/api/memory/region?bdf=15:00.0')
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.get_json()
            print(f"Device BDF: {data.get('device_bdf')}")
            print(f"Registers count: {len(data.get('registers', []))}")
        else:
            print(f"Error: {response.data}")

if __name__ == "__main__":
    print("API Testing Script")
    print("=" * 50)
    
    try:
        test_device_api()
        test_memory_region_api()
        test_memory_region_with_bdf()
        print("\n" + "=" * 50)
        print("All tests completed!")
    except Exception as e:
        print(f"Test failed with error: {e}")
        import traceback
        traceback.print_exc() 