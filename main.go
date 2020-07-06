package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx" // sudo go get -u github.com/jackc/pgx
)

/* /home/ec2-user/Signal-Server/signalserverHD -sdf /home/ec2-user/efs -lat 51.849 -lon -2.2299 -txh 25 -f 450 -erp 20 -rxh 2 -rt 10 -o test2 -R 10 -res 3600 -pm 3 */
const StaticFilePathTest = "/home/ec2-user/RFCoverageWebServer/static/"
const SpeedTestFilePathTest = "/home/ec2-user/RFCoverageWebServer/speedtest/"
const SpeedTestDevFilePathTest = "/home/ec2-user/RFCoverageWebServer/speedtestdev/"
const LidarFilePathTest = "/home/ec2-user/RFCoverageWebServer/lidarviewer/"

const AccessControlAllowOriginURLS = "*"

const AccessControlAllowOriginURLSQuery = "https://www.facebook.com"
const AccessControlAllowOriginURLSSuffix = "facebook.com"


func serveStatusOk(writer http.ResponseWriter, request *http.Request) {
	writer.Header().Set("Access-Control-Allow-Origin", AccessControlAllowOriginURLS)
	writer.WriteHeader(http.StatusOK)
}

/**********************************************/
/* Market Sizing API + Connection to Database */
/**********************************************/
const (
	host     = "microsoft-building-footprints.cedcz50bv5p9.us-east-2.rds.amazonaws.com"
	port     = 5432
	user     = "fbcmasteruser"
	dbname   = "postgres"
)

func processArguments(request *http.Request) (query string, isGeojson bool){
	/* Get GET Parameters from URL*/
	var coords, geojson string
	for k, v := range request.URL.Query() {
		switch k {
		case "coordinates":
			coords = v[0]
		case "geojson":
			geojson= v[0]
		default:
			fmt.Println("Unknown argument:" + k + "|" + (v[0]))
		}
	}
	if len(coords) > 0 {
		query = formatCoordinates(coords)
		isGeojson = false
	} else {
		query = geojson 
		isGeojson = true
	}
	return
}

func formatCoordinates(coords string) (coord_query string){
	coords2 := strings.Split(coords, "%2C")
	var coords3 = ""
	if len(coords2) > 0 {
		coords3 = coords2[0]
	}
	for i := 1; i < len(coords2); i++ {
		var sep = ","
		if (i % 2) != 0 {
			sep = " "
		}
		coords3 += sep + coords2[i]
	}
	coord_query = "POLYGON((" + coords3 + "))"
	return
}

type MarketSizingCountResponse struct {
	Error         int `json:"error"`
	BuildingCount int `json:"buildingcount"`
}

func serveMarketSizingCountRequest(writer http.ResponseWriter, request *http.Request) {
	if strings.HasSuffix(request.Header.Get("Origin"), AccessControlAllowOriginURLSSuffix) {
		writer.Header().Set("Access-Control-Allow-Origin", request.Header.Get("Origin"))
	}
	var error = 0
	/* Get GET Parameters from URL*/
	query, isGeojson := processArguments(request)

	/* PGX Connection */
	dsn := "host=" + host + " user=" + user + " password=" + password + " dbname=" + dbname + " port=" + strconv.Itoa(port)
	conn, err := pgx.Connect(context.Background(), dsn)
	if err != nil {
		panic(err)
	}
	defer conn.Close(context.Background())

	/* Run Query on DB */
	var query_skeleton string
	if( isGeojson) {
		query_skeleton = "SELECT COUNT(*) FROM (SELECT * FROM microsoftfootprints WHERE ST_Intersects(geog, ST_GeomFromGeoJSON($1)) LIMIT 10001) AS a;"
	} else {
		query_skeleton = "SELECT COUNT(*) FROM (SELECT * FROM microsoftfootprints WHERE ST_Intersects(geog, $1) LIMIT 10001) AS a;"
	}
	rows, QueryErr := conn.Query(context.Background(), query_skeleton, query)

	if QueryErr != nil {
		error = -1
		println(QueryErr)
	}
	defer rows.Close()
	var count int
	for rows.Next() {
		err = rows.Scan(&count)
		if err != nil {
			error = -1
		}
	}
	response := MarketSizingCountResponse{
		Error:         error,
		BuildingCount: count,
	}
	if err := json.NewEncoder(writer).Encode(response); err != nil {
		panic(err)
	}
	writer.Header().Set("Content-Type", "application/json")
}

type MarketSizingIncomeResponse struct {
	Error     int     `json:"error"`
	AvgIncome float32 `json:"avgincome"`
	AvgError  float32 `json:"avgerror"`
}

func serveMarketSizingIncomeRequest(writer http.ResponseWriter, request *http.Request) {
	if strings.HasSuffix(request.Header.Get("Origin"), AccessControlAllowOriginURLSSuffix) {
		writer.Header().Set("Access-Control-Allow-Origin", request.Header.Get("Origin"))
	}
	var error = 0
	/* Get GET Parameters from URL*/
	query, isGeojson := processArguments(request)

	/* PGX Connection */
	dsn := "host=" + host + " user=" + user + " password=" + password + " dbname=" + dbname + " port=" + strconv.Itoa(port)
	conn, err := pgx.Connect(context.Background(), dsn)
	if err != nil {
		error = -2
	}
	defer conn.Close(context.Background())

	/* Run Query on DB */
	var query_skeleton string
	if( isGeojson) {
		query_skeleton = `
		SELECT Avg(avgbuildingvalues.avgincome2018building) AS avgincome2018, 
			   Avg(avgbuildingvalues.avgerror2018building)  AS avgerror2018 
		FROM   (SELECT unnested_intersecting_footprints.gid, 
					   Avg(tract.income2018) AS avgincome2018building, 
					   Avg(tract.error2018)  AS avgerror2018building 
				FROM   (SELECT intersecting_footprints.*, 
							   Unnest(microsoftfootprint2tracts.tractgids) AS tractgid 
						FROM   (SELECT * 
								FROM   microsoftfootprints 
								WHERE  St_intersects(microsoftfootprints.geog, 
									ST_GeomFromGeoJSON($1)
		) LIMIT 10001) AS intersecting_footprints 
		LEFT JOIN microsoftfootprint2tracts 
			   ON intersecting_footprints.gid = microsoftfootprint2tracts.footprintgid) 
		AS unnested_intersecting_footprints 
		LEFT JOIN tract 
			   ON tract.gid = unnested_intersecting_footprints.tractgid 
		 GROUP  BY unnested_intersecting_footprints.gid) AS avgbuildingvalues;`
	} else {
		query_skeleton = `
		SELECT Avg(avgbuildingvalues.avgincome2018building) AS avgincome2018, 
			   Avg(avgbuildingvalues.avgerror2018building)  AS avgerror2018 
		FROM   (SELECT unnested_intersecting_footprints.gid, 
					   Avg(tract.income2018) AS avgincome2018building, 
					   Avg(tract.error2018)  AS avgerror2018building 
				FROM   (SELECT intersecting_footprints.*, 
							   Unnest(microsoftfootprint2tracts.tractgids) AS tractgid 
						FROM   (SELECT * 
								FROM   microsoftfootprints 
								WHERE  St_intersects(microsoftfootprints.geog, 
		$1
		) LIMIT 10001) AS intersecting_footprints 
		LEFT JOIN microsoftfootprint2tracts 
			   ON intersecting_footprints.gid = microsoftfootprint2tracts.footprintgid) 
		AS unnested_intersecting_footprints 
		LEFT JOIN tract 
			   ON tract.gid = unnested_intersecting_footprints.tractgid 
		 GROUP  BY unnested_intersecting_footprints.gid) AS avgbuildingvalues;`
	}
	rows, QueryErr := conn.Query(context.Background(), query_skeleton, query)

	if QueryErr != nil {
		error = -1
	}
	defer rows.Close()
	var avg_income float32
	var avg_error float32
	for rows.Next() {
		err = rows.Scan(&avg_income, &avg_error)
		if err != nil {
			error = -1
		}

	}
	response := MarketSizingIncomeResponse{
		Error:     error,
		AvgIncome: avg_income,
		AvgError:  avg_error,
	}
	if err := json.NewEncoder(writer).Encode(response); err != nil {
		panic(err)
	}
	writer.Header().Set("Content-Type", "application/json")
}

type MarketSizingResponse struct {
	Error            int      `json:"error"`
	Numbuildings     int      `json:"numbuildings"`
	BuildingPolygons []string `json:"polygons"`
}

func serveMarketSizingRequest(writer http.ResponseWriter, request *http.Request) {
	if strings.HasSuffix(request.Header.Get("Origin"), AccessControlAllowOriginURLSSuffix) {
		writer.Header().Set("Access-Control-Allow-Origin", request.Header.Get("Origin"))
	}
	/* Get GET Parameters from URL*/
	query, isGeojson := processArguments(request)

	/* PGX Connection */
	dsn := "host=" + host + " user=" + user + " password=" + password + " dbname=" + dbname + " port=" + strconv.Itoa(port)
	conn, err := pgx.Connect(context.Background(), dsn)
	if err != nil {
		panic(err)
	}
	defer conn.Close(context.Background())

	/* Run Query on DB */
	var query_skeleton string
	if( isGeojson) {
		query_skeleton = "SELECT gid, us_state, ST_AsGeoJSON(geog) FROM microsoftfootprints WHERE ST_Intersects(geog, ST_GeomFromGeoJSON($1)) LIMIT 10001;"
	} else {
		query_skeleton = "SELECT gid, us_state, ST_AsGeoJSON(geog) FROM microsoftfootprints WHERE ST_Intersects(geog, $1) LIMIT 10001;"
	}
	rows, QueryErr := conn.Query(context.Background(), query_skeleton, query)
	if QueryErr != nil {
		panic(QueryErr)
	}
	defer rows.Close()
	var sum = 0
	var polygons = []string{}
	for rows.Next() {
		var n int32
		var state string
		var polygon string
		err = rows.Scan(&n, &state, &polygon)
		if err != nil {
			panic(err)
		}
		sum += 1
		polygons = append(polygons, polygon)
	}
	response := MarketSizingResponse{
		Error:            0,
		Numbuildings:     sum,
		BuildingPolygons: polygons,
	}
	if err := json.NewEncoder(writer).Encode(response); err != nil {
		panic(err)
	}
	writer.Header().Set("Content-Type", "application/json")
}


type MarketCompetitionResponse struct {
	Error       int      `json:"error"`
	Competitors []string `json:"competitors"`
	Down        []float32    `json:"down_ad_speed"`
	Up          []float32    `json:"up_ad_speed"`
	Tech        [][]int  `json:"tech_used"`
}

func serveMarketCompetitionRequest(writer http.ResponseWriter, request *http.Request) {
	if strings.HasSuffix(request.Header.Get("Origin"), AccessControlAllowOriginURLSSuffix) {
		writer.Header().Set("Access-Control-Allow-Origin", request.Header.Get("Origin"))
	}
	/* Get GET Parameters from URL*/
	query, isGeojson := processArguments(request)

	/* PGX Connection */
	dsn := "host=" + host + " user=" + user + " password=" + password + " dbname=" + dbname + " port=" + strconv.Itoa(port)
	conn, err := pgx.Connect(context.Background(), dsn)
	if err != nil {
		panic(err)
	}
	defer conn.Close(context.Background())

	/* Run Query on DB */
	var query_skeleton string
	if( isGeojson) {
		query_skeleton = "SELECT providername, MAX(maxaddown) as maxaddown, MAX(maxadup) as maxadup, ARRAY_AGG(DISTINCT techcode) as tech FROM form477jun2019 JOIN blocks on blocks.geoid10=form477jun2019.blockcode WHERE ST_Intersects(blocks.geog, ST_GeomFromGeoJSON($1)) AND maxaddown > 0 AND maxadup > 0 GROUP BY providername ORDER BY maxaddown DESC LIMIT 16;"
	} else {
		query_skeleton = "SELECT providername, MAX(maxaddown) as maxaddown, MAX(maxadup) as maxadup, ARRAY_AGG(DISTINCT techcode) as tech FROM form477jun2019 JOIN blocks on blocks.geoid10=form477jun2019.blockcode WHERE ST_Intersects(blocks.geog, $1) AND maxaddown > 0 AND maxadup > 0 GROUP BY providername ORDER BY maxaddown DESC LIMIT 16;"
	}
	rows, QueryErr := conn.Query(context.Background(), query_skeleton, query)
	if QueryErr != nil {
		panic(QueryErr)
	}

	defer rows.Close()
	var competitors = []string{}
	var downs = []float32{}
	var ups = []float32{}
	var techs = [][]int{}
	for rows.Next() {
		var competitor string
		var up float32
		var down float32
		var tech = []int{}
		err = rows.Scan(&competitor, &down, &up, &tech)
		if err != nil {
			panic(err)
		}
		competitors = append(competitors, competitor)
		downs = append(downs, down)
		ups = append(ups, up)
		techs = append(techs, tech)
	}
	response := MarketCompetitionResponse{
		Error:       0,
		Competitors: competitors,
		Down:        downs,
		Up:          ups,
		Tech:        techs,
	}
	if err := json.NewEncoder(writer).Encode(response); err != nil {
		panic(err)
	}
	writer.Header().Set("Content-Type", "application/json")
}

type MarketRDOFResponse struct {
	Error         int `json:"error"`
	CensusBlockGroup []string `json:"censusblockgroup"`
	County      []string `json:"county"`
	Geojson     []string `json:"geojson"`
	Reserve     []int `json:"reserve"`
	Locations   []int `json:"locations"`
}

func serveMarketRDOFRequest(writer http.ResponseWriter, request *http.Request) {
	if strings.HasSuffix(request.Header.Get("Origin"), AccessControlAllowOriginURLSSuffix) {
		writer.Header().Set("Access-Control-Allow-Origin", request.Header.Get("Origin"))
	}
	var error = 0
	/* Get GET Parameters from URL*/
	query, isGeojson := processArguments(request)

	/* PGX Connection */
	dsn := "host=" + host + " user=" + user + " password=" + password + " dbname=" + dbname + " port=" + strconv.Itoa(port)
	conn, err := pgx.Connect(context.Background(), dsn)
	if err != nil {
		panic(err)
	}
	defer conn.Close(context.Background())

	/* Run Query on DB */
	var query_skeleton string
	if( isGeojson) {
		query_skeleton = "SELECT cbg_id, county, ST_AsGeoJSON(geog), reserve, locations FROM auction_904_shp WHERE ST_Intersects(geog, ST_GeomFromGeoJSON($1)) LIMIT 100;"
	} else {
		query_skeleton = "SELECT cbg_id, county, ST_AsGeoJSON(geog), reserve, locations FROM auction_904_shp WHERE ST_Intersects(geog, $1) LIMIT 100;"
	}
	rows, QueryErr := conn.Query(context.Background(), query_skeleton, query)

	if QueryErr != nil {
		error = -1
		println(QueryErr)
	}
	defer rows.Close()

	var cbgs, countys, geojsons = []string{}, []string{}, []string{}
	var reserves, locations = []int{}, []int{}
	var reserve, location int
	var cbg, county, geojson string
	for rows.Next() {
		err = rows.Scan(&cbg, &county, &geojson, &reserve, &location)
		if err != nil {
			error = -1
		}
		cbgs = append(cbgs, cbg)
		countys = append(countys, county)
		geojsons = append(geojsons, geojson)
		reserves = append(reserves, reserve)
		locations = append(locations, location)
	}
	response := MarketRDOFResponse {
		Error:         error,
		CensusBlockGroup: cbgs,
		County:      countys,
		Geojson:     geojsons,
		Reserve:     reserves,
		Locations:   locations,
	}
	if err := json.NewEncoder(writer).Encode(response); err != nil {
		panic(err)
	}
	writer.Header().Set("Content-Type", "application/json")
}

func main() {
	fmt.Println("Starting HomesPassed WebServer")

	http.HandleFunc("/market-income/", serveMarketSizingIncomeRequest)
	http.HandleFunc("/market-competition/", serveMarketCompetitionRequest)
	http.HandleFunc("/market-count/", serveMarketSizingCountRequest)
	http.HandleFunc("/market-size/", serveMarketSizingRequest)
	http.HandleFunc("/market-rdof/", serveMarketRDOFRequest)


	staticfs := http.FileServer(http.Dir(StaticFilePathTest))
	speedtestfs := http.FileServer(http.Dir(SpeedTestFilePathTest))
	speedtestdevfs := http.FileServer(http.Dir(SpeedTestDevFilePathTest))
	lidarfs := http.FileServer(http.Dir(LidarFilePathTest))
	http.Handle("/static/", http.StripPrefix("/static/", staticfs))
	http.Handle("/speedtest/", http.StripPrefix("/speedtest/", speedtestfs))
	http.Handle("/speedtestdev/", http.StripPrefix("/speedtestdev/", speedtestdevfs))
	http.Handle("/lidarviewer/", http.StripPrefix("/lidarviewer/", lidarfs))

	http.HandleFunc("/", serveStatusOk)
	http.ListenAndServe(":80", nil)
}
