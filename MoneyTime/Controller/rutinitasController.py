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

    # Tambah Rutinitas 
    def add_rutinitas(self, user_id: int, nama_task: str, hari: str, waktu: str, prioritas: str) -> bool:
        try:
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
                print(f"Validasi Schema Gagal (Update Status Rutinitas): {errors}")
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
            print(f"Error update status rutinitas: {error}")
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

            if errors:
                print(f"Validasi Schema Gagal (Edit Rutinitas): {errors}")
                return False

            rutinitas = self.db.query(Rutinitas).filter_by(rutinitasid=rutinitas_id).first()

            if rutinitas:
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
            print(f"Error edit rutinitas: {error}")
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
            print(f"Error delete rutinitas: {error}")
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
            print(f"Error reset weekly rutinitas: {error}")
            return False