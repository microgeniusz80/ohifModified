import { DicomMetadataStore, IWebApiDataSource, utils } from '@ohif/core';
import OHIF from '@ohif/core';
import dcmjs from 'dcmjs';

const metadataProvider = OHIF.classes.MetadataProvider;
const { EVENTS } = DicomMetadataStore;

const END_MODALITIES = {
  SR: true,
  SEG: true,
  DOC: true,
};

const compareValue = (v1, v2, def = 0) => {
  if (v1 === v2) {
    return def;
  }
  if (v1 < v2) {
    return -1;
  }
  return 1;
};

// Sorting SR modalities to be at the end of series list
const customSort = (seriesA, seriesB) => {
  const instanceA = seriesA.instances[0];
  const instanceB = seriesB.instances[0];
  const modalityA = instanceA.Modality;
  const modalityB = instanceB.Modality;

  const isEndA = END_MODALITIES[modalityA];
  const isEndB = END_MODALITIES[modalityB];

  if (isEndA && isEndB) {
    // Compare by series date
    return compareValue(instanceA.SeriesNumber, instanceB.SeriesNumber);
  }
  if (!isEndA && !isEndB) {
    return compareValue(instanceB.SeriesNumber, instanceA.SeriesNumber);
  }
  return isEndA ? -1 : 1;
};

function createDicomLocalApi(dicomLocalConfig) {
  const { name } = dicomLocalConfig;

  const implementation = {
    initialize: ({ params, query }) => {},
    query: {
      studies: {
        mapParams: () => {},
        search: params => {
          const studyUIDs = DicomMetadataStore.getStudyInstanceUIDs();

          return studyUIDs.map(StudyInstanceUID => {
            let numInstances = 0;
            const modalities = new Set();

            // Calculating the number of instances in the study and modalities
            // present in the study
            const study = DicomMetadataStore.getStudy(StudyInstanceUID);
            study.series.forEach(aSeries => {
              numInstances += aSeries.instances.length;
              modalities.add(aSeries.instances[0].Modality);
            });

            // first instance in the first series
            const firstInstance = study?.series[0]?.instances[0];

            if (firstInstance) {
              return {
                accession: firstInstance.AccessionNumber,
                date: firstInstance.StudyDate,
                description: firstInstance.StudyDescription,
                mrn: firstInstance.PatientID,
                patientName: utils.formatPN(firstInstance.PatientName),
                studyInstanceUid: firstInstance.StudyInstanceUID,
                time: firstInstance.StudyTime,
                //
                instances: numInstances,
                modalities: Array.from(modalities).join('/'),
                NumInstances: numInstances,
              };
            }
          });
        },
        processResults: () => {
          console.warn(' DICOMLocal QUERY processResults not implemented');
        },
      },
      series: {
        search: studyInstanceUID => {
          const study = DicomMetadataStore.getStudy(studyInstanceUID);
          return study.series.map(aSeries => {
            const firstInstance = aSeries?.instances[0];
            return {
              studyInstanceUid: studyInstanceUID,
              seriesInstanceUid: firstInstance.SeriesInstanceUID,
              modality: firstInstance.Modality,
              seriesNumber: firstInstance.SeriesNumber,
              seriesDate: firstInstance.SeriesDate,
              numSeriesInstances: aSeries.instances.length,
              description: firstInstance.SeriesDescription,
            };
          });
        },
      },
      instances: {
        search: () => {
          console.warn(' DICOMLocal QUERY instances SEARCH not implemented');
        },
      },
    },
    retrieve: {
      directURL: params => {
        const { instance, tag, defaultType } = params;

        const value = instance[tag];
        if (value instanceof Array && value[0] instanceof ArrayBuffer) {
          return URL.createObjectURL(
            new Blob([value[0]], {
              type: defaultType,
            })
          );
        }
      },
      series: {
        metadata: async ({ StudyInstanceUID, madeInClient = false } = {}) => {
          if (!StudyInstanceUID) {
            throw new Error('Unable to query for SeriesMetadata without StudyInstanceUID');
          }

          // Instances metadata already added via local upload
          const study = DicomMetadataStore.getStudy(StudyInstanceUID, madeInClient);

          // Series metadata already added via local upload
          DicomMetadataStore._broadcastEvent(EVENTS.SERIES_ADDED, {
            StudyInstanceUID,
            madeInClient,
          });

          study.series.forEach(aSeries => {
            const { SeriesInstanceUID } = aSeries;

            const isMultiframe = aSeries.instances[0].NumberOfFrames > 1;

            aSeries.instances.forEach((instance, index) => {
              const {
                url: imageId,
                StudyInstanceUID,
                SeriesInstanceUID,
                SOPInstanceUID,
              } = instance;

              instance.imageId = imageId;

              // Add imageId specific mapping to this data as the URL isn't necessarily WADO-URI.
              metadataProvider.addImageIdToUIDs(imageId, {
                StudyInstanceUID,
                SeriesInstanceUID,
                SOPInstanceUID,
                frameIndex: isMultiframe ? index : 1,
              });
            });

            DicomMetadataStore._broadcastEvent(EVENTS.INSTANCES_ADDED, {
              StudyInstanceUID,
              SeriesInstanceUID,
              madeInClient,
            });
          });
        },
      },
    },
    store: {
      dicom: naturalizedReport => {
        const reportBlob = dcmjs.data.datasetToBlob(naturalizedReport);
        console.log('blob lalala')
        console.log('solat', naturalizedReport['StudyID']);

        const reader = new FileReader();


        reader.onload = async function (event) {
          console.log('solat 3', reader.result);

          var provenanceJson = //keeps provenance fhir resource format, so that we can modify its content, after user signed the canvas
          {
            "resourceType": "Provenance",
            "target": [{
                "reference": "",
                "type":"" // put patient ID here to save his/her provenance information
            },
            {
              "reference": "",
              "type":"" // put patient ID here to save his/her provenance information
            }],
            "recorded": "",
            "agent": [{
                "role": [{
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/v3-RoleClass",
                        "code": "PAT",
                        "display": "Patient"
                    }]
                }],
                "who": {
                    "reference": ""
                }
            }],
            "signature": [{
                "type": [{
                    "system": "urn:iso-astm:E1762-95:2013",
                    "code": "1.2.840.10065.1.12.1.1",
                    "display": "Author's Signature"
                }],
                "when": "",
                "who": {
                    "reference": ""
                },
                "data": ""
            }]
          };

          provenanceJson.signature[0].data = reader.result;

          console.log(JSON.stringify(provenanceJson))













          console.log('change back to blob')

          //const base64Response = await fetch(`data:image/jpeg;base64,${base64Data}`);
          const base64Response = await fetch(reader.result);
          const blob = await base64Response.blob();
          console.log('final blob', blob);

          console.log('sending now');

          const MY_TOKEN = "sl.B31opC6w3I63ISOc-woSDXy5msX2gCtucS7TD7uzaTQrNuyRQtde_rVdV_DjEulbGHyETR6Pn6MubaEVJaF5mWSIVvWPmnO8EUx2eOAQsHFJpVfXfW89So_61etuIC9SEfhARAugkH6T6_IzCOSm8fQ"

          await fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'post',
            body: reportBlob, //Base64
            headers: {'Authorization': 'Bearer '+MY_TOKEN,
                      'Content-Type': 'application/octet-stream',
                      'Accept': 'application/json',
                'Dropbox-API-Arg': '{"path": "/dicom4/file002","mode": "add","autorename": false,"mute": false,"strict_conflict": false}'
                                        }
          }).then(function(response) {
            console.log('berjaya')
                console.log("berjaya", response.json());
          });




          //dream factory file upload here ****************************************************************************

          await fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'post',
            body: reportBlob, //Base64
            headers: {'Authorization': 'Bearer '+MY_TOKEN,
                      'Content-Type': 'application/octet-stream',
                      'Accept': 'application/json',
                'Dropbox-API-Arg': '{"path": "/dicom4/file002","mode": "add","autorename": false,"mute": false,"strict_conflict": false}'
                                        }
          }).then(function(response) {
            console.log('berjaya')
                console.log("berjaya", response.json());
          });



          // const adata = reader.result
          // console.log('changing back to blob')

          // const byteCharacters = atob(adata);
          // const byteArrays = [];

          // for (let i = 0; i < byteCharacters.length; i++) {
          //     byteArrays.push(byteCharacters.charCodeAt(i));
          // }

          // const byteArray = new Uint8Array(byteArrays);
          // const theblobby = new Blob([byteArray], { type: "text/plain" });
          // console.log('the blobbed', theblobby)

//           I found the answer, I had to encode in Base 64 the content of my Blob:

            // var reader = new FileReader
            // reader.readAsDataURL(blob)
            // var data = reader.result;
            // //don't need type informations
            // data = data.split(",").pop();
            // and just after the "Content-Type" value in the second part of the request, I added this line:

            // 'Content-Transfer-Encoding: base64'
            // and now it works!

            // and don't worry, in my code I used my FileReader in an asynchronous way, I just simplified here for brevity.

        };

        // reader.readAsText(reportBlob);
        reader.readAsDataURL(reportBlob)





        //Create a URL for the binary.
        var objectUrl = URL.createObjectURL(reportBlob);
        console.log('object', objectUrl)
        window.location.assign(objectUrl);
      },
    },
    getImageIdsForDisplaySet(displaySet) {
      const images = displaySet.images;
      const imageIds = [];

      if (!images) {
        return imageIds;
      }

      displaySet.images.forEach(instance => {
        const NumberOfFrames = instance.NumberOfFrames;
        if (NumberOfFrames > 1) {
          // in multiframe we start at frame 1
          for (let i = 1; i <= NumberOfFrames; i++) {
            const imageId = this.getImageIdsForInstance({
              instance,
              frame: i,
            });
            imageIds.push(imageId);
          }
        } else {
          const imageId = this.getImageIdsForInstance({ instance });
          imageIds.push(imageId);
        }
      });

      return imageIds;
    },
    getImageIdsForInstance({ instance, frame }) {
      const { StudyInstanceUID, SeriesInstanceUID, SOPInstanceUID } = instance;
      const storedInstance = DicomMetadataStore.getInstance(
        StudyInstanceUID,
        SeriesInstanceUID,
        SOPInstanceUID
      );

      let imageId = storedInstance.url;

      if (frame !== undefined) {
        imageId += `&frame=${frame}`;
      }

      return imageId;
    },
    deleteStudyMetadataPromise() {
      console.log('deleteStudyMetadataPromise not implemented');
    },
    getStudyInstanceUIDs: ({ params, query }) => {
      const { StudyInstanceUIDs: paramsStudyInstanceUIDs } = params;
      const queryStudyInstanceUIDs = query.getAll('StudyInstanceUIDs');

      const StudyInstanceUIDs = queryStudyInstanceUIDs || paramsStudyInstanceUIDs;
      const StudyInstanceUIDsAsArray =
        StudyInstanceUIDs && Array.isArray(StudyInstanceUIDs)
          ? StudyInstanceUIDs
          : [StudyInstanceUIDs];

      // Put SRs at the end of series list to make sure images are loaded first
      let isStudyInCache = false;
      StudyInstanceUIDsAsArray.forEach(StudyInstanceUID => {
        const study = DicomMetadataStore.getStudy(StudyInstanceUID);
        if (study) {
          study.series = study.series.sort(customSort);
          isStudyInCache = true;
        }
      });

      return isStudyInCache ? StudyInstanceUIDsAsArray : [];
    },
  };
  return IWebApiDataSource.create(implementation);
}

export { createDicomLocalApi };
