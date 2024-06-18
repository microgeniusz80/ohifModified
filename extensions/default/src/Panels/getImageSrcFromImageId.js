/**
 * @param {*} cornerstone
 * @param {*} imageId
 */
function getImageSrcFromImageId(cornerstone, imageId) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    console.log('getting image source from id ilyas');
    cornerstone.utilities
      .loadImageToCanvas({ canvas, imageId, thumbnail: true })
      .then(imageId => {
        resolve(canvas.toDataURL());
      })
      .catch(reject);
  });
}
export default getImageSrcFromImageId;
