# Scripts to Update Form 477 Table

# 1. get zip file from fcc website
# 2. unzip file
# 3. change encoding `iconv -f ISO88592 -t UTF8` - for rows such as America Movil
# 4. create table - optionally copy last year `CREATE TABLE {new_table} AS TABLE {old_table} WITH NO DATA;`
# 5. copy converted csv into db into new table (see wiki)
# 6. add indexes so queries are fast `CREATE INDEX ON <table> USING btree(blockcode);`
# 7. update query in product code
