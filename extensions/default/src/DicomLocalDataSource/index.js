import { DicomMetadataStore, IWebApiDataSource, utils } from '@ohif/core';
import OHIF from '@ohif/core';
import dcmjs from 'dcmjs';
import { useEffect } from 'react';
import { ayam, kucing, reloadLink } from '../../../globaldata/globallydata';

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
        const storageName = naturalizedReport['StudyID'];
        const storageFileName = naturalizedReport['SeriesDescription'];
        console.log('solat', naturalizedReport['StudyID']);
        console.log('full', naturalizedReport);

        console.log('baca', ayam.split('/')[0]);
        var tempatSimpan = ayam.split('/')[0];


        const reader = new FileReader();

        reader.onload = async function (event) {
          console.log('solat 3', reader.result);

          console.log('change back to blob')

          //const base64Response = await fetch(`data:image/jpeg;base64,${base64Data}`);
          const base64Response = await fetch(reader.result);
          const blob = await base64Response.blob();
          console.log('final blob', blob);

          console.log('sending now');

          const baseData = reader.result.split(',')[1];
          console.log('baseData', baseData);

          try {
            const foldername = tempatSimpan;
            const filename = storageFileName;
            const contentFile = reportBlob;

            const theData = {
              resource: [
                  {
                      "name": "ImagingResult/",
                      "path": "ImagingResult/",
                      "type": "folder",
                  },
                  {
                      "size": 10596,
                      "name": "ImagingResult/testfileb.txt",
                      "path": "ImagingResult/testfileb.txt",
                      "type": "file",
                      "is_base64": true,
                      "content_type": "application/txt",
                      "content": "kucing henasem", }
              ]
            }



            async function fetchData() {

              var dreamToken = ''



              await fetch('https://provider.ecosys.mhn.asia/api/v1/factory/get-token')
                .then((res) => res.json())
                .then((data) => {
                    dreamToken = data.token;
                    console.log('the tokenin viewer: ',dreamToken);
                })
                .catch((err) => {
                    console.log(err.message);
                });

                const headersApi = {
                  'Authorization': 'Bearer '+dreamToken,
                  'Content-Type': 'application/json',
                  'X-DreamFactory-API-Key': '36fda24fe5588fa4285ac6c6c2fdfbdb6b6bc9834699774c9bf777f706d05a88',
                  'Accept': '*/*'
                }
console.log('the dreamtoken penat', dreamToken)
              await fetch('https://dreamfactory5.ecosys.mhn.asia/api/v2/files/ImagingResult/'+ foldername +'/?check_exist=false', {
                method: 'POST',
                headers: headersApi,
              }).then(function(response) {
                console.log("dreamFolder", response.json());
              });

              await fetch('https://dreamfactory5.ecosys.mhn.asia/api/v2/files/ImagingResult/'+ foldername +'/'+ filename +'?check_exist=false', {
                method: 'POST',
                headers: headersApi,
                body: contentFile,
              }).then(function(response) {
                console.log("dreamFile", response.json());
              });

              window.location.href = reloadLink;

            }

            fetchData();

          } catch (e) {
            console.error(e);
          }


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
        //window.location.assign(objectUrl);
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
