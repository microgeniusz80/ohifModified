var ayam = 'ayam';
var reloadLink = '';

function kucing(dataayam){
  ayam = dataayam;
  return dataayam;
}

function reloadtheLink(theLink){
  reloadLink = 'https://firesyaf-13c1a.web.app/local?id=' + theLink;
  //reloadLink = 'http://localhost:3000/local?id=' + theLink;
}

export { ayam, kucing, reloadtheLink, reloadLink };
