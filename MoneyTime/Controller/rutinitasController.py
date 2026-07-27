from Database.models import Rutinitas
from Database.orm import db
from Utils.cache import cache
from Schema.schema import RutinitasSchema
from marshmallow import ValidationError
from typing import List, Dict, Any

class RutinitasController:
    def __init__(self):
        self.db = db.session
        self.rutinitas_schema = RutinitasSchema()

    # --- FUNGSI CEK BENTROK JADWAL ---
    def _cek_bentrok(self, user_id: int, hari: str, waktu: str, exclude_id: int = None) -> bool:
        try:
            parts = waktu.split('-')
            start_str = parts[0].strip().replace(':', '.')
            end_str = parts[1].strip().replace(':', '.')
            
            s_h, s_m = map(int, start_str.split('.'))
            e_h, e_m = map(int, end_str.split('.'))
            
            new_start = (s_h * 60) + s_m
            new_end = (e_h * 60) + e_m
            if new_end < new_start: new_end += (24 * 60)

            query = self.db.query(Rutinitas).filter_by(userid=user_id, hari=hari)
            if exclude_id:
                query = query.filter(Rutinitas.rutinitasid != exclude_id)
                
            existing_tasks = query.all()
            
            for task in existing_tasks:
                if not task.waktu: continue
                
                t_parts = task.waktu.split('-')
                t_start_str = t_parts[0].strip().replace(':', '.')
                t_end_str = t_parts[1].strip().replace(':', '.')
                
                ts_h, ts_m = map(int, t_start_str.split('.'))
                te_h, te_m = map(int, t_end_str.split('.'))
                
                task_start = (ts_h * 60) + ts_m
                task_end = (te_h * 60) + te_m
                if task_end < task_start: task_end += (24 * 60)

                # Logika overlap: Start A < End B DAN End A > Start B
                if new_start < task_end and new_end > task_start:
                    return True # Ada bentrok!
                    
            return False
        except Exception as e:
            print(f"Error cek bentrok: {e}")
            return False

    # Tambah Rutinitas 
    def add_rutinitas(self, user_id: int, nama_task: str, hari: str, waktu: str, prioritas: str) -> bool:
        try:
            # Cek Bentrok sebelum dimasukkan
            if self._cek_bentrok(user_id, hari, waktu):
                print("Validasi Gagal: Jadwal bertabrakan dengan rutinitas lain.")
                return False

            new_rutinitas = self.rutinitas_schema.load({
                "userid": user_id,
                "nama_task": nama_task,
                "hari": hari,
                "waktu": waktu,
                "prioritas": prioritas,
                "status": "To Do"
            })
            
            self.db.add(new_rutinitas)
            self.db.commit()
            cache.delete_memoized(self.get_rutinitas, user_id)
            return True
            
        except ValidationError as error:
            self.db.rollback()
            print(f"Validasi Schema Gagal (Add Rutinitas): {error.messages}")
            return False
        except Exception as error:
            self.db.rollback()
            print(f"Error add rutinitas: {error}")
            return False

    # Ambil Rutinitas 
    @cache.memoize(timeout=300)
    def get_rutinitas(self, user_id: int, hari: str = None) -> List[Dict[str, Any]]:
        try:
            query = self.db.query(Rutinitas).filter_by(userid=user_id)

            if hari:
                query = query.filter_by(hari=hari)
                
            rows = query.order_by(Rutinitas.waktu.asc()).all()
            
            results = []
            for row in rows:
                results.append({
                    'id': row.rutinitasid,
                    'title': row.nama_task or "No Task",
                    'hari': row.hari,
                    'time': row.waktu,
                    'priority': row.prioritas or "None",
                    'status': row.status or "To Do"
                }) 

            return results
        
        except Exception as e:
            print(f"Error get_rutinitas: {e}")
            return []

    # Update Status 
    def update_status(self, rutinitas_id: int, status: str) -> bool:
        try:
            errors = self.rutinitas_schema.validate({"status": status}, partial=True)
            if errors:
                return False

            rutinitas = self.db.query(Rutinitas).filter_by(rutinitasid=rutinitas_id).first()
            if rutinitas:
                rutinitas.status = status
                user_id = rutinitas.userid
                self.db.commit()
                cache.delete_memoized(self.get_rutinitas, user_id)
                return True
            return False
        except Exception as error:
            self.db.rollback()
            return False

    # Edit Rutinitas
    def edit_rutinitas(self, rutinitas_id: int, nama_task: str, hari: str, waktu: str, prioritas: str) -> bool:
        try:
            errors = self.rutinitas_schema.validate({
                "nama_task": nama_task,
                "hari": hari,
                "waktu": waktu,
                "prioritas": prioritas
            }, partial=True)

            if errors: return False

            rutinitas = self.db.query(Rutinitas).filter_by(rutinitasid=rutinitas_id).first()
            if rutinitas:
                if self._cek_bentrok(rutinitas.userid, hari, waktu, exclude_id=rutinitas_id):
                    print("Validasi Gagal: Edit jadwal bertabrakan.")
                    return False

                rutinitas.nama_task = nama_task
                rutinitas.hari = hari
                rutinitas.waktu = waktu
                rutinitas.prioritas = prioritas
                
                user_id = rutinitas.userid
                self.db.commit()

                cache.delete_memoized(self.get_rutinitas, user_id)
                return True
            return False
            
        except Exception as error:
            self.db.rollback()
            return False

    # Hapus Rutinitas
    def delete_rutinitas(self, rutinitas_id: int) -> bool:
        try:
            rutinitas = self.db.query(Rutinitas).filter_by(rutinitasid=rutinitas_id).first()
            if rutinitas:
                user_id = rutinitas.userid
                self.db.delete(rutinitas)
                self.db.commit()
                cache.delete_memoized(self.get_rutinitas, user_id)
                return True
            return False
        except Exception as error:
            self.db.rollback()
            return False

    # Fitur Reset Mingguan 
    def reset_weekly_status(self, user_id: int) -> bool:
        try:
            self.db.query(Rutinitas).filter_by(userid=user_id).update({"status": "To Do"})
            self.db.commit()
            cache.delete_memoized(self.get_rutinitas, user_id)
            return True
        except Exception as error:
            self.db.rollback()
            return False