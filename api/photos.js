/*
 * API sub-router for businesses collection endpoints.
 */

const { Router } = require('express')
const {ObjectId,GridFSBucket} = require('mongodb')
const { getDbReference } = require('../lib/mongo')
const multer = require('multer')
const crypto = require('crypto')
const fs = require('fs')


const { validateAgainstSchema } = require('../lib/validation')
const {
  PhotoSchema,
  insertNewPhoto,
  getPhotoById
} = require('../models/photo')

const router = Router()

const imageTypes = {
  'image/jpeg':'jpg', 
  'image/png':'png',
}
/*
* This is a function to Upload a file in the server
*/
const upload = multer({
  storage: multer.diskStorage({
  destination: `${__dirname}/uploads`,
    filename: (req, file, callback) => {
      const filename = crypto.pseudoRandomBytes(16).toString('hex')
      const extension = imageTypes[file.mimetype]
      callback(null, `${filename}.${extension}`)
    }
  }),
  fileFilter: (req, file, callback) => {
    callback(null, !!imageTypes[file.mimetype])
  }
})

/*
  * Get a photo by its ID
*/
async function getImageInfoById(id) {
  const db = getDBReference();
  const bucket = new GridFSBucket(db, { bucketName: 'images' });

  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await bucket.find({ _id: new ObjectId(id) }).toArray();;
    return results[0];
  }
}

/*
  * Save an image file to the server
*/
function saveImageFile(image) {
  return new Promise((resolve, reject) => {
    const db = getDbReference()
    const bucket = new GridFSBucket(db, { bucketName: 'images' })
    const metadata = {
      contentType: image.contentType,
      businessId: image.businessId,
    }
    const uploadStream = bucket.openUploadStream(
      image.filename,
      { metadata: metadata }
    )
    fs.createReadStream(image.path).pipe(uploadStream)
    .on('error', (err) => {
      reject(err)
    })
    .on('finish', (result) => {
      resolve(result._id)
  })
}
)}

/*
  * Remove a photo from the server
*/
function removeUploadedFile(file) {
  return new Promise((resolve, reject) => {
    fs.unlink(file.path, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/*
  * Get a photo by its filename
*/
function getImageDownloadStreamByFilename(filename) {
  const db = getDbReference();
  const bucket =
    new GridFSBucket(db, { bucketName: 'images' });
  return bucket.openDownloadStreamByName(filename);
}


/*
 * POST /photos - Route to create a new photo.
 */
router.post('/',upload.single('image'),async (req, res,next) => {
  if (req.file && validateAgainstSchema(req.body, PhotoSchema)){
    const image = {
      contentType: req.file.mimetype,
      filename: req.file.filename,
      path: req.file.path,
      businessId: req.body.businessId
    }
  try {
    const id = await saveImageFile(image);
    const remove = await removeUploadedFile(req.file);
    res.status(201).send({
      id: id
    })
  } catch (err) {
    console.error(err)
    res.status(500).send({
      error: "Error inserting photo into DB.  Please try again later."
    })
  
    res.status(400).send({
      error: "Request body is not a valid photo object"
    })
  }
}
})


/*
 * GET /photos/{id} - Route to fetch info about a specific photo.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const photo = await getPhotoById(req.params.id)
    if (photo) {
      res.status(200).send(photo)
    } else {
      next()
    }
  } catch (err) {
    console.error(err)
    res.status(500).send({
      error: "Unable to fetch photo.  Please try again later."
    })
  }
})

module.exports = router
