import traceback
from typing import Optional, List

from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

from pciecfg.main import PCIeRegisterParser, PCIeDataFromOSGenerator
from pciecfg import common

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

# Global state variables
current_device_bdf: Optional[str] = None
current_config_space_parser: Optional[PCIeRegisterParser] = None
current_data_generator = PCIeDataFromOSGenerator("00:00.0")


def get_pcie_info(register_structs_list):
    registers_data = []
    for reg_struct in register_structs_list:
        try:
            block_reg = {
                'name': reg_struct.name,
                'offset': reg_struct.offset,
                'size': reg_struct.size,
                'registers': []
            }

            for reg in reg_struct.registers:
                fields = reg.fields

                register_data = {
                    'name': reg.name,
                    'offset': reg.offset,
                    'size': reg.size,
                    'value': reg.value,
                    'fields': []
                }

                for field in fields:
                    field_data = {
                        'name': field.name,
                        'bit_offset': field.bit_offset,
                        'bit_width': field.bit_width,
                        'default': field.default,
                        'value_parse': field.value_parse,
                        'description': field.description,
                        'attributes': field.attributes,
                        'value': reg[field.name]
                    }
                    register_data['fields'].append(field_data)

                block_reg['registers'].append(register_data)
        
            registers_data.append(block_reg)
        except Exception as e:
            print(f'Error processing register {getattr(reg, "name", "unknown")}: {e}')
            continue
    
    return registers_data


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("layout.html", {"request": request})


@app.get("/index.html", response_class=HTMLResponse)
async def register_detail(request: Request, name: Optional[str] = Query(None)):
    global current_config_space_parser

    context = {"request": request}
    if name and current_config_space_parser:
        try:
            register_obj = None
            obj_lists = current_config_space_parser[name]
            if isinstance(obj_lists, list):
                for obj in obj_lists:
                    if isinstance(obj, common.Register):
                        register_obj = obj
                        break
            else:
                if isinstance(obj_lists, common.Register):
                    register_obj = obj_lists

            if register_obj is None:
                raise HTTPException(status_code=404, detail="Register not found")
            
            register_data = {
                'name': register_obj.name,
                'offset': register_obj.offset,
                'size': register_obj.size,
                'value': register_obj.value,
                'type': getattr(register_obj, 'type', 'unknown'),
                'fields': []
            }
            
            for field in register_obj.fields:
                field_data = {
                    'name': field.name,
                    'bit_offset': field.bit_offset,
                    'bit_width': field.bit_width,
                    'startBit': field.bit_offset,
                    'endBit': field.bit_offset + field.bit_width - 1,
                    'default': field.default,
                    'value': field.extract(register_obj.value),
                    'description': field.description,
                    'attributes': field.attributes,
                    'value_parse': field.value_parse
                }
                register_data['fields'].append(field_data)
            
            context.update({
                'register_name': name,
                'register_data': register_data,
                'device_bdf': current_device_bdf
            })
            
        except Exception as e:
            print(f"Error getting register {name}: {e}")
            context['error'] = f"无法找到寄存器: {name}"
    
    return templates.TemplateResponse("index.html", context)


@app.get("/api/device")
async def get_device():
    print('get_device')
    try:
        lines = current_data_generator.get_pcie_device_list()
    except FileNotFoundError:
        return []

    device_list = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        parts = line.split(' ', 1)
        if len(parts) < 2:
            continue
        device_bdf = parts[0]
        device_name = parts[1]
        device_list.append({
            'bdf': device_bdf,
            'name': device_name,
            'description': device_name
        })

    print(f'Found {len(device_list)} devices')
    return device_list


@app.get("/api/memory/region")
async def get_memory_region(bdf: Optional[str] = Query(None)):
    global current_device_bdf, current_config_space_parser

    try:
        if bdf:
            current_device_bdf = bdf
            current_data_generator.bdf = bdf
            current_config_space_parser = PCIeRegisterParser(current_data_generator)
            print(f'Loaded config space for device {bdf}')
        elif current_device_bdf is None:
            raise HTTPException(status_code=400, detail="Device BDF not specified")
        
        response_data = {
            'regions': [],
            'device_bdf': current_device_bdf
        }

        regions = current_config_space_parser.region
        for region in regions:
            structures = region.reg_structure
            registers_data = get_pcie_info(structures)
            response_data['regions'].append({
                'name': region.name,
                'startAddress': region.start_address,
                'size': region.size,
                'type': region.type,
                'description': region.description,
                'registers_data': registers_data,
                'raw_data': list(region.raw_data) if region.raw_data else []
            })
        
        return response_data

    except Exception as e:
        print(f'Error in get_memory_region: {e}')
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/register")
async def get_register(
    bdf: str = Query(...),
    offset: Optional[str] = Query(None),
    name: Optional[str] = Query(None)
):
    global current_device_bdf, current_config_space_parser

    print('Call get_register')

    if not bdf:
        raise HTTPException(status_code=400, detail="Missing bdf parameter")

    try:
        if current_device_bdf != bdf or current_config_space_parser is None:
            current_device_bdf = bdf
            data_generator = PCIeDataFromOSGenerator(bdf)
            current_config_space_parser = PCIeRegisterParser(data_generator)

        target_register = None

        if name is not None:
            target_register = current_config_space_parser[name]

        if not target_register:
            raise HTTPException(status_code=404, detail="Register not found")

        register_info = {
            'name': target_register.name,
            'offset': target_register.offset,
            'size': target_register.size,
            'value': target_register.value,
            'device_bdf': bdf,
            'fields': []
        }

        for field in target_register.fields:
            field_info = {
                'name': field.name,
                'bit_offset': field.bit_offset,
                'bit_width': field.bit_width,
                'startBit': field.bit_offset,
                'endBit': field.bit_offset + field.bit_width - 1,
                'default': field.default,
                'value': target_register[field.name],
                'description': field.description,
                'attributes': field.attributes,
                'value_parse': field.value_parse
            }
            register_info['fields'].append(field_info)

        return register_info

    except Exception as e:
        print(f'Error in get_register: {e}')
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


from pydantic import BaseModel


class RegisterUpdateRequest(BaseModel):
    bdf: str
    value: int
    offset: Optional[str] = None
    name: Optional[str] = None


@app.post("/api/register")
async def set_register(request: RegisterUpdateRequest):
    global current_device_bdf, current_config_space_parser

    try:
        bdf = request.bdf
        value = request.value
        offset = request.offset
        name = request.name

        if not bdf:
            raise HTTPException(status_code=400, detail="Missing bdf parameter")

        if not offset and not name:
            raise HTTPException(status_code=400, detail="Missing offset or name parameter")

        if current_device_bdf != bdf or current_config_space_parser is None:
            try:
                current_device_bdf = bdf
                current_config_space_parser = PCIeRegisterParser(PCIeDataFromOSGenerator(bdf))
            except Exception as e:
                raise HTTPException(status_code=404, detail=f"Failed to load device data: {str(e)}")

        target_register = None

        if name:
            try:
                target_register = current_config_space_parser[name]
            except KeyError:
                pass

        if not target_register and offset is not None:
            offset_int = int(offset, 16) if isinstance(offset, str) and offset.startswith('0x') else int(offset)
            for reg_struct in current_config_space_parser.all_structures:
                for reg in reg_struct.registers:
                    if reg.offset == offset_int:
                        target_register = reg
                        break
                if target_register:
                    break

        if not target_register:
            raise HTTPException(status_code=404, detail="Register not found")

        # 模拟写入
        print(f'Writing value 0x{value:08x} to register {target_register.name} at offset 0x{target_register.offset:03x} for device {bdf}')
        target_register.value = value

        return {
            'success': True,
            'message': 'Register updated successfully',
            'register': target_register.name,
            'offset': target_register.offset,
            'value': value
        }

    except Exception as e:
        print(f'Error in set_register: {e}')
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
