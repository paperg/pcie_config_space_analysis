from flask import Flask, render_template, jsonify, request
from pcie_register import CommandRegister

app = Flask(__name__)
register = CommandRegister()

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
    app.run(debug=True) 