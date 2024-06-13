import React, { useEffect, useRef } from 'react';
import classnames from 'classnames';
import { useNavigate } from 'react-router-dom';
import { DicomMetadataStore, MODULE_TYPES } from '@ohif/core';

import Dropzone from 'react-dropzone';
import filesToStudies from './filesToStudies';

import { extensionManager } from '../../App.tsx';

import { Icon, Button, LoadingIndicatorProgress } from '@ohif/ui';

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
  const dicomUrl = "https://dl.dropboxusercontent.com/scl/fi/du34941obm3ke4n9s98pw/0020.DCM?rlkey=v3dkk4292gasuqjus16hyeqc3&dl=0";
  const anotherdicom = "https://dl.dropboxusercontent.com/scl/fi/80yhri7y5rpmzat3h28gw/MRBRAIN.DCM?rlkey=qs0l43h2folbmdnj5pyr8yx0v&st=5rd2m3o3&dl=0";
  const navigate = useNavigate();
  const dropzoneRef = useRef();
  const [dropInitiated, setDropInitiated] = React.useState(false);

  // Initializing the dicom local dataSource
  const dataSourceModules = extensionManager.modules[MODULE_TYPES.DATA_SOURCE];
  console.log('tengok');
  console.log(dataSourceModules);
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

  async function displayDicom() {
    console.log('displayDicom');
    try {
      // get the data into an ArrayBuffer
      // const response = await fetch(dicomUrl).then(data => {
      //   const obj = data;
      //   console.log('boleh ke separate: ', data);
      //   onDrop([obj]);
      //  });

      const response = await (await fetch(anotherdicom)).blob();
      //const response = await fetch(dicomUrl);
      //await (await fetch(dicomUrl)).blob()
      //console.log('response: ', response);
      //const buffer = await response.arrayBuffer();
      //console.log('buffer: ', buffer);
      onDrop([response]);
      // parse it
      //const image = dicomjs.parseImage(new DataView(buffer));
      //console.log('image: ', image)
      //console.log('number of image: ', image['numberOfFrames'])
      // render to canvas
      //renderer = new dicomjs.Renderer(canvas);
      // decode, and display frame 0 on the canvas
      // await renderer.render(image, 0);
    } catch (e) {
      //console.error(e);
    }
  }

  displayDicom();

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
