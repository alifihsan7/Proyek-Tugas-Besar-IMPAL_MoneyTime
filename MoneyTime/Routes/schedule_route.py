from flask import Blueprint, request, jsonify, session
from Controller.scheduleController import ScheduleController
from Controller.rutinitasController import RutinitasController

schedule = Blueprint('schedule', __name__)

schedule_controller = ScheduleController()
rutinitas_controller = RutinitasController()

# Get Schedule Route (Untuk Modul Money/Time Lama)
@schedule.route('/api/schedules', methods=['GET'])
def get_schedules() :

    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    user_id = session['user'].get('id')
    schedules = schedule_controller.get_schedules(user_id)
    return jsonify({'success': True, 'schedules': schedules})

# Get Schedule Categories Route
@schedule.route('/api/schedule-categories', methods=['GET'])
def get_schedule_categories() :

    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    user_id = session['user'].get('id')
    categories = schedule_controller.get_categories(user_id)
    return jsonify({'success': True, 'categories': categories})


# Add Rutinitas Route
@schedule.route('/rutinitas', methods=['POST'])
def add_rutinitas():

    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
    data = request.json
    user_id = session['user'].get('id') 
    
    success = rutinitas_controller.add_rutinitas(
        user_id=user_id,
        nama_task=data.get('nama_task'),
        hari=data.get('hari'),
        waktu=data.get('waktu'),
        prioritas=data.get('prioritas')
    )
    
    if success:
        return jsonify({"success": True, "message": "Rutinitas berhasil ditambahkan"}), 201
    
    return jsonify({"success": False, "message": "Gagal menambahkan rutinitas atau jadwal bentrok"}), 500

# Get Rutinitas Route
@schedule.route('/api/rutinitas', methods=['GET'])
def get_rutinitas():

    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
    user_id = session['user'].get('id') 
    hari = request.args.get('hari')
    rutinitas = rutinitas_controller.get_rutinitas(user_id, hari)
    
    return jsonify({"success": True, "data": rutinitas}), 200

# Update Rutinitas Status Route
@schedule.route('/api/rutinitas/<int:rutinitas_id>/status', methods=['PATCH'])
def update_rutinitas_status(rutinitas_id):

    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
    data = request.json
    success = rutinitas_controller.update_status(rutinitas_id, data.get('status'))
    
    if success:
        return jsonify({"success": True, "message": "Status rutinitas diperbarui"}), 200
    return jsonify({"success": False, "message": "Gagal memperbarui status"}), 500

# Manage Rutinitas Route
@schedule.route('/rutinitas/<int:rutinitas_id>', methods=['PUT', 'DELETE'])
def manage_rutinitas(rutinitas_id):
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
    if request.method == 'PUT':
        data = request.json
        success = rutinitas_controller.edit_rutinitas(
            rutinitas_id=rutinitas_id,
            nama_task=data.get('nama_task'),
            hari=data.get('hari'),
            waktu=data.get('waktu'),
            prioritas=data.get('prioritas')
        )
        msg = "diedit"
        
    elif request.method == 'DELETE':
        success = rutinitas_controller.delete_rutinitas(rutinitas_id)
        msg = "dihapus"

    if success:
        return jsonify({"success": True, "message": f"Rutinitas berhasil {msg}"}), 200
    return jsonify({"success": False, "message": f"Gagal {msg} rutinitas atau jadwal bentrok"}), 500

# Reset Mingguan
@schedule.route('/rutinitas/<int:user_id>/reset', methods=['POST'])
def reset_weekly(user_id):
    success = rutinitas_controller.reset_weekly_status(user_id)

    if success:
        return jsonify({"success": True, "message": "Semua rutinitas berhasil di-reset"}), 200
    
    return jsonify({"success": False, "message": "Gagal me-reset rutinitas"}), 500