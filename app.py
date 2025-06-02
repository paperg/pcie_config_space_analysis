from flask import Flask, render_template, jsonify, request
from pcie_register import CommandRegister
import os

app = Flask(__name__)
register = CommandRegister()

# Mock data for demonstration - replace with actual memory reading logic
def get_pcie_config_space():
    # Return 4KB of data (4096 bytes)
    return [0x00] * 4096

def get_membar0_space():
    # Return 1MB of data (1048576 bytes) - adjust size as needed
    return [0x00] * 1048576

@app.route('/')
def index():
    return render_template('layout.html')

@app.route('/api/memory/<region>')
def get_memory_data(region):
    if region == 'pcie':
        data = get_pcie_config_space()
    elif region == 'membar0':
        data = get_membar0_space()
    else:
        return jsonify({'error': 'Invalid region'}), 400
    return jsonify(data)

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
    app.run(debug=True) 