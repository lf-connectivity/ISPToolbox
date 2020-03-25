package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

type RFSimMetaDataResponse struct {
	File        string
	BoundingBox [4]float64
}

/* /home/ec2-user/Signal-Server/signalserverHD -sdf /home/ec2-user/efs -lat 51.849 -lon -2.2299 -txh 25 -f 450 -erp 20 -rxh 2 -rt 10 -o test2 -R 10 -res 3600 -pm 3 */
const SignalServerBinaryPath = "/home/ec2-user/Signal-Server/signalserverHD"
const SDFFilePath = "/home/ec2-user/efs"
const OutputArg = "/home/ec2-user/output/"
const ConvertPath = "/usr/bin/convert"
const StaticFilePathTest = "/home/ec2-user/RFCoverageWebServer/static/"
const SpeedTestFilePathTest = "/home/ec2-user/RFCoverageWebServer/speedtest/"

const AccessControlAllowOriginURLS = "*"

func serveRFRequest(writer http.ResponseWriter, request *http.Request) {
	writer.Header().Set("Access-Control-Allow-Origin", AccessControlAllowOriginURLS)
	var LatArg = "51.849"
	var LngArg = "-2.2299"
	var TxHArg = "25"
	var FreqArg = "450"
	var ErpArg = "20"
	var RxHArg = "2"
	var RtArg = "10"
	var RArg = "10"
	var ResArg = "3600"
	var PmArg = "3"
	/* Get GET Parameters from URL*/
	for k, v := range request.URL.Query() {
		switch k {
		case "lat":
			LatArg = v[0]
		case "lng":
			LngArg = v[0]
		case "txh":
			TxHArg = v[0]
		case "freq":
			FreqArg = v[0]
		case "Erp":
			ErpArg = v[0]
		case "rxh":
			RxHArg = v[0]
		case "Rt":
			RtArg = v[0]
		case "R":
			RArg = v[0]
		case "Res":
			ResArg = v[0]
		case "Pm":
			PmArg = v[0]
		default:
			fmt.Println("Unknown argument:" + k + "|" + (v[0]))
		}
	}
	/*Create Temporary File*/
	file, err := ioutil.TempFile(OutputArg, "output-*")
	if err != nil {
		fmt.Println(err)
		return
	}
	Args := []string{"-sdf", SDFFilePath, "-lat", LatArg, "-lon", LngArg, "-txh", TxHArg, "-f", FreqArg, "-erp", ErpArg, "-rxh", RxHArg, "-rt", RtArg, "-o", file.Name(), "-R", RArg, "-res", ResArg, "-pm", PmArg}
	fmt.Printf("%#v\n", Args)

	/* Run Request through signal server */
	fmt.Println("Running RF Simulation")
	output, err := exec.Command(SignalServerBinaryPath, Args...).CombinedOutput()
	if err != nil {
		fmt.Println(err.Error())
	}
	boundingBox := strings.SplitN(string(output), "|", -1)
	var boundingBoxFloat [4]float64
	var j = 0
	for i := 0; i < len(boundingBox); i++ {
		fmt.Println(boundingBox[i])
		f, err := strconv.ParseFloat(boundingBox[i], 64)
		if err == nil && j < 4 {
			boundingBoxFloat[j] = f
			j++
		}
	}

	/* Convert from ppm to png */
	fmt.Println("Converting output to png")
	ConvertArgs := []string{file.Name() + ".ppm", file.Name() + ".png"}
	outputConvert, errConvert := exec.Command(ConvertPath, ConvertArgs...).CombinedOutput()

	if err != nil {
		fmt.Println(errConvert.Error())
	}
	fmt.Println(outputConvert)
	metadataResponse := RFSimMetaDataResponse{filepath.Base(file.Name()), boundingBoxFloat}
	js, err := json.Marshal(metadataResponse)
	if err != nil {
		http.Error(writer, err.Error(), http.StatusInternalServerError)
		return
	}

	writer.Header().Set("Content-Type", "application/json")
	writer.Write(js)
}

func serveRFFileHandler(writer http.ResponseWriter, request *http.Request) {
	writer.Header().Set("Access-Control-Allow-Origin", AccessControlAllowOriginURLS)
	/* Get GET Parameters from URL*/
	for k, v := range request.URL.Query() {
		switch k {
		default:
			fmt.Println("Unknown argument:" + k + "|" + (v[0]))
		}
	}
	/* Security: ServeFile removes '..' from paths */
	fmt.Println(request.URL.Path[len("/coverage-file/"):])
	http.ServeFile(writer, request, OutputArg+request.URL.Path[len("/coverage-file/"):])
}

func serveStatusOk(writer http.ResponseWriter, request *http.Request) {
	writer.Header().Set("Access-Control-Allow-Origin", AccessControlAllowOriginURLS)
	writer.WriteHeader(http.StatusOK)
}

func main() {
	fmt.Println("Starting RF Coverage WebServer")
	staticfs := http.FileServer(http.Dir(StaticFilePathTest))
	speedtestfs := http.FileServer(http.Dir(SpeedTestFilePathTest))
	http.HandleFunc("/coverage-request/", serveRFRequest)
	http.HandleFunc("/coverage-file/", serveRFFileHandler)
	http.Handle("/static/", http.StripPrefix("/static/", staticfs))
	http.Handle("/speedtest/", http.StripPrefix("/speedtest/", speedtestfs))

	http.HandleFunc("/", serveStatusOk)
	http.ListenAndServe(":80", nil)
}
