## Pre-requirement
* pipenv
* chrome driver for selenium

## Run
```
pipenv run python generateTowerSource.py
```

Output:
*towerLocator.json* need to be manually uploaded to mapbox

## Schema

```
create table dbo.TOWER_PUBACC_CO
(
	record_type               char(2)              null,
	content_indicator         char(3)              null,
	file_number               char(8)              null,
	registration_number       char(7)              null,
	unique_system_identifier  numeric(9,0)         not null,
	coordinate_type           char(1)              not null,
	latitude_degrees          int                  null,
	latitude_minutes          int                  null,
	latitude_seconds          numeric(4,1)         null,
	latitude_direction        char(1)              null,
	latitude_total_seconds    numeric(8,1)         null,
	longitude_degrees         int                  null,
	longitude_minutes         int                  null,
	longitude_seconds         numeric(4,1)         null,
	longitude_direction       char(1)              null,
	longitude_total_seconds   numeric(8,1)         null,
        array_tower_position      int                  null,
        array_total_tower         int                  null
)

create table dbo.TOWER_PUBACC_RA
(
	RECORD_TYPE               char(2)              null,
	CONTENT_INDICATOR         char(3)              null,
	FILE_NUMBER               char(8)              null,
	REGISTRATION_NUMBER       char(7)              null,
	UNIQUE_SYSTEM_IDENTIFIER  numeric(9,0)         not null,
	APPLICATION_PURPOSE       char(2)              null,
	PREVIOUS_PURPOSE          char(2)              null,
	INPUT_SOURCE_CODE         char(1)              null,
	STATUS_CODE               char(1)              null,
	DATE_ENTERED              char(10)             null,
	DATE_RECEIVED             char(10)             null,
	DATE_ISSUED               char(10)             null,
	DATE_CONSTRUCTED          char(10)             null,
	DATE_DISMANTLED           char(10)             null,
	DATE_ACTION               char(10)             null,
	ARCHIVE_FLAG_CODE         char(1)              null,
	VERSION                   int                  null,
	SIGNATURE_FIRST_NAME      varchar(20)          null,
	SIGNATURE_MIDDLE_INITIAL  char(1)              null,
	SIGNATURE_LAST_NAME       varchar(20)          null,
	SIGNATURE_SUFFIX          varchar(3)           null,
	SIGNATURE_TITLE           varchar(40)          null,
	INVALID_SIGNATURE         char(1)              null,
	STRUCTURE_STREET_ADDRESS  varchar(80)          null,
	STRUCTURE_CITY            varchar(20)          null,
	STRUCTURE_STATE_CODE      char(2)              null,
	COUNTY_CODE		  char(5)	       null,
	ZIP_CODE		  varchar(9)           null,
	HEIGHT_OF_STRUCTURE       numeric(5,1)         null,
	GROUND_ELEVATION          numeric(6,1)         null,
	OVERALL_HEIGHT_ABOVE_GROUND numeric(6,1)       null,
	OVERALL_HEIGHT_AMSL       numeric(6,1)         null,
	STRUCTURE_TYPE            char(7)              null,
	DATE_FAA_DETERMINATION_ISSUED char(10)         null,
	FAA_STUDY_NUMBER          varchar(20)          null,
	FAA_CIRCULAR_NUMBER       varchar(10)          null,
	SPECIFICATION_OPTION      int                  null,
	PAINTING_AND_LIGHTING     varchar(100)         null,
	MARK_LIGHT_CODE		  varchar(2)	       null,
	MARK_LIGHT_OTHER	  varchar(30)	       null,
	FAA_EMI_FLAG              char(1)              null,
	NEPA_FLAG                 char(1)              null,
	DATE_SIGNED               char(10)             null,
	signature_last_or    	  varchar(20)          null,
	signature_first_or    	  varchar(20)          null,
	signature_mi_or           char(1)              null,
	signature_suffix_or       varchar(3)           null,
	title_signed_or           varchar(40)          null,
	date_signed_or            char(10)             null
)
```
