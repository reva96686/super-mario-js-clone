/* eslint-disable import/extensions */
export default class ImageLoader {
  static load(url) {
    return new Promise((resolve) => {
      const image = new Image();

      image.addEventListener('load', () => {
        resolve(image);
      });

      image.src = url;
    });
  }
}
