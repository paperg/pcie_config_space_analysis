'''
Author: Peng Guo & <peng.guo@montage-tech.com>
Date: 2025-06-03 09:15:08
LastEditors: pguo peng.guo@montage-tech.com
LastEditTime: 2025-06-03 17:45:20
FilePath: \pcie_config_space_analysis\app.py
Description: 

Copyright (c) 2025 by Montage Technology Corporation/pguo, All Rights Reserved. 
'''
from flask import Flask, render_template, jsonify, request
# from pcie_register import CommandRegister

app = Flask(__name__)
# register = CommandRegister()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/register', methods=['GET'])
def get_register():
    return jsonify({
        'value': register.get_value(),
        'fields': [{
            'name': field.name,
            'bits': field.bits,
            'value': field.value,
            'description': field.description,
            'rw': field.rw
        } for field in register.fields]
    })

@app.route('/api/register', methods=['POST'])
def set_register():
    data = request.get_json()
    value = int(data.get('value', 0))
    register.set_value(value)
    return jsonify({'success': True})

if __name__ == '__main__':
    # app.run(debug=True) 
    from thefuzz import fuzz
    from thefuzz import process

    choices = ['vendor_id', 'device_id', 'command', 'status', 'Advanced_Error_Reporting_Extended_Capability']
    
    while True:
        query = input('Please input the register name: ')
        print(query)
        print(process.extractOne(query, choices))