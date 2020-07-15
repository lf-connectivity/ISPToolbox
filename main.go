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

func processArguments(request *http.Request) (geojson string, exclude string){
	/* Get GET Parameters from URL*/
	for k, v := range request.URL.Query() {
		switch k {
		case "geojson":
			geojson = v[0]
		case "exclude":
			exclude = v[0]
		default:
			fmt.Println("Unknown argument:" + k + "|" + (v[0]))
		}
	}
	return
}

func formatQuerySkeleton(skeleton string, addExclude bool) (string){
	if (addExclude) {
		return fmt.Sprintf(skeleton, "St_intersects(geog, St_geomfromgeojson($1)) AND NOT St_intersects(geog, St_geomfromgeojson($2))")
	} else {
		return fmt.Sprintf(skeleton, "St_intersects(geog, St_geomfromgeojson($1))")
	}
}


type MarketSizingCountResponse struct {
	Error         int `json:"error"`
	BuildingCount int `json:"buildingcount"`
}

func serveMarketSizingCountRequest(writer http.ResponseWriter, request *http.Request) {
	if strings.HasSuffix(request.Header.Get("Origin"), AccessControlAllowOriginURLSSuffix) {
		writer.Header().Set("Access-Control-Allow-Origin", request.Header.Get("Origin"))
	}
	var errorCode = 0
	/* Get GET Parameters from URL*/
	query, exclude := processArguments(request)

	/* PGX Connection */
	dsn := "host=" + host + " user=" + user + " password=" + password + " dbname=" + dbname + " port=" + strconv.Itoa(port)
	conn, err := pgx.Connect(context.Background(), dsn)
	if err != nil {
		panic(err)
	}
	defer conn.Close(context.Background())

	/* Run Query on DB */
	var query_skeleton string
	query_skeleton = `
SELECT Count(*) 
FROM   (SELECT * 
		FROM   msftcombined 
		WHERE  %s
		LIMIT  10001) AS a;`

	var useExclude = len(exclude) != 0
	query_skeleton = formatQuerySkeleton(query_skeleton, useExclude )
	var rows pgx.Rows
	var QueryErr error
	if (useExclude){
		rows, QueryErr = conn.Query(context.Background(), query_skeleton, query, exclude)
	} else {
		rows, QueryErr = conn.Query(context.Background(), query_skeleton, query)
	}

	if QueryErr != nil {
		errorCode = -1
		println(QueryErr)
	}
	defer rows.Close()
	var count int
	for rows.Next() {
		err = rows.Scan(&count)
		if err != nil {
			errorCode = -1
		}
	}
	response := MarketSizingCountResponse{
		Error:         errorCode,
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
	var errorCode = 0
	/* Get GET Parameters from URL*/
	query, exclude := processArguments(request)

	/* PGX Connection */
	dsn := "host=" + host + " user=" + user + " password=" + password + " dbname=" + dbname + " port=" + strconv.Itoa(port)
	conn, err := pgx.Connect(context.Background(), dsn)
	if err != nil {
		errorCode = -2
	}
	defer conn.Close(context.Background())

	/* Run Query on DB */
	var query_skeleton string
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
					 WHERE  %s
					 LIMIT  10001) AS intersecting_footprints 
					LEFT JOIN microsoftfootprint2tracts 
						   ON intersecting_footprints.gid = 
							  microsoftfootprint2tracts.footprintgid) AS 
			unnested_intersecting_footprints 
			LEFT JOIN tract 
				   ON tract.gid = unnested_intersecting_footprints.tractgid 
	 GROUP  BY unnested_intersecting_footprints.gid) AS avgbuildingvalues; `
	
	var useExclude = len(exclude) != 0
	query_skeleton = formatQuerySkeleton(query_skeleton, useExclude )
	var rows pgx.Rows
	var QueryErr error
	if (useExclude){
		rows, QueryErr = conn.Query(context.Background(), query_skeleton, query, exclude)
	} else {
		rows, QueryErr = conn.Query(context.Background(), query_skeleton, query)
	}
	if QueryErr != nil {
		errorCode = -1
	}
	defer rows.Close()
	var avg_income float32
	var avg_error float32
	for rows.Next() {
		err = rows.Scan(&avg_income, &avg_error)
		if err != nil {
			errorCode = -1
		}

	}
	response := MarketSizingIncomeResponse{
		Error:     errorCode,
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
	query, exclude := processArguments(request)

	/* PGX Connection */
	dsn := "host=" + host + " user=" + user + " password=" + password + " dbname=" + dbname + " port=" + strconv.Itoa(port)
	conn, err := pgx.Connect(context.Background(), dsn)
	if err != nil {
		panic(err)
	}
	defer conn.Close(context.Background())

	/* Run Query on DB */
	var query_skeleton string
	query_skeleton =`
SELECT St_asgeojson(geog) 
FROM   msftcombined 
WHERE  %s
LIMIT  10001;`

	var useExclude = len(exclude) != 0
	query_skeleton = formatQuerySkeleton(query_skeleton, useExclude )
	var rows pgx.Rows
	var QueryErr error
	if (useExclude){
		rows, QueryErr = conn.Query(context.Background(), query_skeleton, query, exclude)
	} else {
		rows, QueryErr = conn.Query(context.Background(), query_skeleton, query)
	}
	if QueryErr != nil {
		panic(QueryErr)
	}

	defer rows.Close()
	var sum = 0
	var polygons = []string{}
	for rows.Next() {
		var polygon string
		err = rows.Scan(&polygon)
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
	query, exclude := processArguments(request)

	/* PGX Connection */
	dsn := "host=" + host + " user=" + user + " password=" + password + " dbname=" + dbname + " port=" + strconv.Itoa(port)
	conn, err := pgx.Connect(context.Background(), dsn)
	if err != nil {
		panic(err)
	}
	defer conn.Close(context.Background())

	/* Run Query on DB */
	var query_skeleton string
	query_skeleton = `
SELECT providername, 
	Max(maxaddown)               AS maxdown, 
	Max(maxadup)                 AS maxadup, 
	Array_agg(DISTINCT techcode) AS tech 
FROM   form477jun2019 
	JOIN blocks 
	  ON blocks.geoid10 = form477jun2019.blockcode 
WHERE  %s
	AND consumer > 0
GROUP  BY providername 
ORDER  BY maxdown DESC 
LIMIT  6; `

	var useExclude = len(exclude) != 0
	query_skeleton = formatQuerySkeleton(query_skeleton, useExclude )
	var rows pgx.Rows
	var QueryErr error
	if (useExclude){
		rows, QueryErr = conn.Query(context.Background(), query_skeleton, query, exclude)
	} else {
		rows, QueryErr = conn.Query(context.Background(), query_skeleton, query)
	}
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
	var errorCode = 0
	/* Get GET Parameters from URL*/
	query, exclude := processArguments(request)

	/* PGX Connection */
	dsn := "host=" + host + " user=" + user + " password=" + password + " dbname=" + dbname + " port=" + strconv.Itoa(port)
	conn, err := pgx.Connect(context.Background(), dsn)
	if err != nil {
		panic(err)
	}
	defer conn.Close(context.Background())

	/* Run Query on DB */
	var query_skeleton string
		query_skeleton = `
SELECT cbg_id, 
       county, 
       St_asgeojson(geog), 
       reserve, 
       locations 
FROM   auction_904_shp 
WHERE  %s
LIMIT  100;`
	var useExclude = len(exclude) != 0
	query_skeleton = formatQuerySkeleton(query_skeleton, useExclude )
	var rows pgx.Rows
	var QueryErr error
	if (useExclude){
		rows, QueryErr = conn.Query(context.Background(), query_skeleton, query, exclude)
	} else {
		rows, QueryErr = conn.Query(context.Background(), query_skeleton, query)
	}

	if QueryErr != nil {
		errorCode = -1
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
			errorCode = -1
		}
		cbgs = append(cbgs, cbg)
		countys = append(countys, county)
		geojsons = append(geojsons, geojson)
		reserves = append(reserves, reserve)
		locations = append(locations, location)
	}
	response := MarketRDOFResponse {
		Error:         errorCode,
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

type MarketDataAvailable struct {
	Error         int `json:"error"`
	Data bool `json:"data"`
}

/* Simply Checks if Request Overlaps with 50 states + DC */
func serveMarketDataAvailableRequest(writer http.ResponseWriter, request *http.Request) {
	if strings.HasSuffix(request.Header.Get("Origin"), AccessControlAllowOriginURLSSuffix) {
		writer.Header().Set("Access-Control-Allow-Origin", request.Header.Get("Origin"))
	}
	var errorCode = 0
	/* Get GET Parameters from URL*/
	query, exclude := processArguments(request)

	/* PGX Connection */
	dsn := "host=" + host + " user=" + user + " password=" + password + " dbname=" + dbname + " port=" + strconv.Itoa(port)
	conn, err := pgx.Connect(context.Background(), dsn)
	if err != nil {
		panic(err)
	}
	defer conn.Close(context.Background())

	/* Run Query on DB */
	var query_skeleton string
	query_skeleton = `
SELECT geoid 
FROM   tl_2017_us_state 
WHERE  %s;`

	var useExclude = len(exclude) != 0
	query_skeleton = formatQuerySkeleton(query_skeleton, useExclude )
	var rows pgx.Rows
	var QueryErr error
	if (useExclude){
		rows, QueryErr = conn.Query(context.Background(), query_skeleton, query, exclude)
	} else {
		rows, QueryErr = conn.Query(context.Background(), query_skeleton, query)
	}
	if QueryErr != nil {
		errorCode = -1
		println(QueryErr)
	}
	defer rows.Close()

	var data_available = false
	var geoid string
	for rows.Next() {
		err = rows.Scan(&geoid)
		if err != nil {
			errorCode = -1
		}
		switch geoid{
		case "60":
		case "66":
		case "69":
		case "78":
		case "72":
		default:
			data_available = true
			break
		}
	}
	response := MarketDataAvailable {
		Error:         errorCode,
		Data: data_available,
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
	http.HandleFunc("/market-data-available/", serveMarketDataAvailableRequest)

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
