from django.db import connections

_FESM_LPC_PROJ_QUERY = """
SELECT s_date, e_date
FROM fesm_lpc_proj
WHERE LOWER(project_id)=LOWER(%s)
"""

def get_collection_years_for_project_id(project_id):
    """Queries the database for start/end years for the given project id.
    
    Returns a tuple of start/end year if found, otherwise returns Nones
    """
    with connections['gis_data'].cursor() as cursor:
        cursor.execute(_FESM_LPC_PROJ_QUERY, [project_id])
        row = cursor.fetchone()

        # Fallback if row not found
        if not row:
            return None, None
        else:
            s_date, e_date = row
            return s_date.year, e_date.year