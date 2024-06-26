import React, { useEffect, useRef, useState } from 'react';
import classnames from 'classnames';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DicomMetadataStore, MODULE_TYPES } from '@ohif/core';
import Dropzone from 'react-dropzone';
import filesToStudies from './filesToStudies';
import { extensionManager } from '../../App.tsx';
import { Icon, Button, LoadingIndicatorProgress } from '@ohif/ui';
import { sample } from 'lodash';
import { ayam, kucing, reloadtheLink, reloadLink } from '../../../../../extensions/globaldata/globallydata.js';
const getLoadButton = (onDrop, text, isDir) => {
  return (
    <Dropzone
      onDrop={onDrop}
      noDrag
    >
      {({ getRootProps, getInputProps }) => (
        <div {...getRootProps()}>
          <Button
            rounded="full"
            variant="contained" // outlined
            disabled={false}
            endIcon={<Icon name="launch-arrow" />} // launch-arrow | launch-info
            className={classnames('font-large', 'ml-2')}
            onClick={() => {}}
          >
            {text}
            {isDir ? (
              <input
                {...getInputProps()}
                webkitdirectory="true"
                mozdirectory="true"
              />
            ) : (
              <input {...getInputProps()} />
            )}
          </Button>
        </div>
      )}
    </Dropzone>
  );
};
type LocalProps = {
  modePath: string;
};

function Local({ modePath }: LocalProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  //const query = new URLSearchParams(this.props.location.search);
  const navigate = useNavigate();
  const dropzoneRef = useRef();
  const [dropInitiated, setDropInitiated] = React.useState(false);
  // Initializing the dicom local dataSource
  const dataSourceModules = extensionManager.modules[MODULE_TYPES.DATA_SOURCE];
  const localDataSources = dataSourceModules.reduce((acc, curr) => {
    const mods = [];
    curr.module.forEach(mod => {
      if (mod.type === 'localApi') {
        mods.push(mod);
      }
    });
    return acc.concat(mods);
  }, []);
  const firstLocalDataSource = localDataSources[0];
  const dataSource = firstLocalDataSource.createDataSource({});
  const microscopyExtensionLoaded = extensionManager.registeredExtensionIds.includes(
    '@ohif/extension-dicom-microscopy'
  );
  async function uploadData() {
    const postURL = 'https://provider.ecosys.mhn.asia/api/v1/factory/multiple-file-base64?folderPath=ImagingResult/';
    
    const sampleData = {
      "resource": [
          {
              "name": "ilyas",
              "path": "ilyas",
              "type": "folder"
          },
          {
              "name": "ilyas/testfile.pdf",
              "path": "ilyas/testfile.pdf",
              "type": "file",
              "is_base64": true,
              "content_type": "application/pdf",
              "content": "JVBE",
          }
      ]
  }
    
    const rawResponse = await fetch(postURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // body: JSON.stringify({a: 1, b: 'Textual content'})
      body: JSON.stringify(sampleData),
    });
    const content = await rawResponse.json();
  
    console.log(content);
  }
  async function displayDicom() {
    const paramdata = searchParams.get('id');
    reloadtheLink(paramdata);
    console.log('linkdata', reloadLink);
    console.log('param: ', paramdata);
    console.log('the saved url:', ayam);
    console.log('fungsi kucing:', kucing(searchParams.get('id')));
    console.log('the saved url:', ayam);
    const currentFolder = searchParams.get('id').split('/')[0];
    console.log('nama folder', currentFolder)
    //const paramurl = "https://dreamfactory5.ecosys.mhn.asia/api/v2/files/ImagingResult/" + "da34099a-6a48-4e73-9d67-a7350d496043/N2D0002.dcm" + "?content=true&is_base64=true&view=true";
    const paramurl = "https://dreamfactory5.ecosys.mhn.asia/api/v2/files/ImagingResult/" + paramdata + "?content=true&is_base64=true&view=true";
    const semuaFile = "https://dreamfactory5.ecosys.mhn.asia/api/v2/files/ImagingResult/" + currentFolder + "/";

    var filelist = [];
    var bloblist = [];

    try {
      let a = '';
      useEffect(async () => {
        await fetch('https://provider.ecosys.mhn.asia/api/v1/factory/get-token')
             .then((res) => res.json())
             .then((data) => {
                a = data.token;
                console.log('the token: ',a);
             })
             .catch((err) => {
                console.log(err.message);
             });
        // await fetch(paramurl,{
        //       method:'GET',
        //       headers: {
        //         "X-DreamFactory-API-Key": "36fda24fe5588fa4285ac6c6c2fdfbdb6b6bc9834699774c9bf777f706d05a88",
        //         "X-DreamFactory-Session-Token": a,
        //       },
        //     }).then(
        //       response => {
        //         return response.blob().then(blob => {
        //             onDrop([blob]);
        //         })
        //       }
        //     ).catch((err) => {
        //     console.log(err.message);
        //   });

          await fetch(semuaFile, {
            method:'GET',
            headers: {
              "X-DreamFactory-API-Key": "36fda24fe5588fa4285ac6c6c2fdfbdb6b6bc9834699774c9bf777f706d05a88",
              "X-DreamFactory-Session-Token": a,
            },
          }).then((res) => res.json())
          .then((data) => {
             console.log('the semua file data: ',data.resource);
             filelist = data.resource;
          }).catch((err) => {
          console.log(err.message);
        });

        console.log('nampak: ', filelist)
        // filelist.forEach(async (file) => {
        //   console.log('file: ', file.path)

        //     await fetch("https://dreamfactory5.ecosys.mhn.asia/api/v2/files/" + file.path + "?content=true&is_base64=true&view=true",{
        //       method:'GET',
        //       headers: {
        //         "X-DreamFactory-API-Key": "36fda24fe5588fa4285ac6c6c2fdfbdb6b6bc9834699774c9bf777f706d05a88",
        //         "X-DreamFactory-Session-Token": a,
        //       },
        //     }).then(
        //       response => {
        //         return response.blob().then(blob => {
        //           onDrop([blob])
        //         })
        //       }
        //     ).catch((err) => {
        //     console.log(err.message);
        //   });
        // })

              var theOptions = {
                method:'GET',
                headers: {
                  "X-DreamFactory-API-Key": "36fda24fe5588fa4285ac6c6c2fdfbdb6b6bc9834699774c9bf777f706d05a88",
                  "X-DreamFactory-Session-Token": a,
                },
              }

        // await filelist.forEach(async (file) => {
        //   var theresponse = await (await fetch("https://dreamfactory5.ecosys.mhn.asia/api/v2/files/" + file.path + "?content=true&is_base64=true&view=true", theOptions)).blob();
        //   console.log('respon dia',theresponse)
          
        //   bloblist = [...bloblist, theresponse]
        //   //onDrop([theresponse])

        // })

        for (var file of filelist){
            var theresponse = await (await fetch("https://dreamfactory5.ecosys.mhn.asia/api/v2/files/" + file.path + "?content=true&is_base64=true&view=true", theOptions)).blob();
          console.log('respon dia',theresponse)
          bloblist.push(theresponse)
        }

        console.log('bloblist:',bloblist)

        onDrop(bloblist);

      }, []);
    } catch (e) {
      console.error(e);
    }
  }
  displayDicom();
  //uploadData();
  const onDrop = async acceptedFiles => {
    // acceptedFiles.forEach(file => {
    //   const reader = new FileReader();
    //   reader.onabort = () => console.log('file reading was aborted');
    //   reader.onerror = () => console.log('file reading has failed');
    //   reader.onload = () => {
    //     // Do whatever you want with the file contents
    //     const binaryStr = reader.result;
    //     console.log('data to check: ', binaryStr);
    //   };
    //   reader.readAsArrayBuffer(file);
    // });
    // console.log('file diterima');
    // console.log(acceptedFiles);
    const studies = await filesToStudies(acceptedFiles);
    const query = new URLSearchParams();
    if (microscopyExtensionLoaded) {
      // TODO: for microscopy, we are forcing microscopy mode, which is not ideal.
      //     we should make the local drag and drop navigate to the worklist and
      //     there user can select microscopy mode
      const smStudies = studies.filter(id => {
        const study = DicomMetadataStore.getStudy(id);
        return (
          study.series.findIndex(s => s.Modality === 'SM' || s.instances[0].Modality === 'SM') >= 0
        );
      });
      if (smStudies.length > 0) {
        smStudies.forEach(id => query.append('StudyInstanceUIDs', id));
        modePath = 'microscopy';
      }
    }
    // Todo: navigate to work list and let user select a mode
    studies.forEach(id => query.append('StudyInstanceUIDs', id));
    console.log('dalam studies: ', query);
    query.append('datasources', 'dicomlocal');
    console.log('dalam studies2: ', query);
    console.log('query: ', decodeURIComponent(query.toString()));
    console.log('url: ', `/${modePath}?${decodeURIComponent(query.toString())}`);
    navigate(`/${modePath}?${decodeURIComponent(query.toString())}`);
  };
  // Set body style
  useEffect(() => {
    document.body.classList.add('bg-black');
    return () => {
      document.body.classList.remove('bg-black');
    };
  }, []);
  return (
    <Dropzone
      ref={dropzoneRef}
      onDrop={acceptedFiles => {
        setDropInitiated(true);
        onDrop(acceptedFiles);
      }}
      noClick
    >
      {({ getRootProps }) => (
        <div
          {...getRootProps()}
          style={{ width: '100%', height: '100%' }}
        >
          <div className="flex h-screen w-screen items-center justify-center ">
            <div className="bg-secondary-dark mx-auto space-y-2 rounded-lg py-8 px-8 drop-shadow-md">
              <div className="flex items-center justify-center">
                <Icon
                  name="logo-dark-background"
                  className="h-28"
                />
              </div>
              <div className="space-y-2 pt-4 text-center">
                {dropInitiated ? (
                  <div className="flex flex-col items-center justify-center pt-48">
                    <LoadingIndicatorProgress className={'h-full w-full bg-black'} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-base text-blue-300">
                      Note: You data is not uploaded to any server, it will stay in your local
                      browser application
                    </p>
                    <p className="text-xg text-primary-active pt-6 font-semibold">
                      Drag and Drop DICOM files here to load them in the Viewer
                    </p>
                    <p className="text-lg text-blue-300">Or click to </p>
                  </div>
                )}
              </div>
              <div className="flex justify-around pt-4 ">
                {getLoadButton(onDrop, 'Load files', false)}
                {getLoadButton(onDrop, 'Load folders', true)}
              </div>
            </div>
          </div>
        </div>
      )}
    </Dropzone>
  );
}
export default Local;
