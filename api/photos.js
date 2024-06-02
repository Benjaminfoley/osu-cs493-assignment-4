/*
 * API sub-router for businesses collection endpoints.
 */

const { Router } = require('express')
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
 * POST /photos - Route to create a new photo.
 */
router.post('/', async (req, res) => {
  if (validateAgainstSchema(req.body, PhotoSchema)) {
    try {
      const id = await insertNewPhoto(req.body)
      res.status(201).send({
        id: id,
        links: {
          photo: `/photos/${id}`,
          business: `/businesses/${req.body.businessId}`
        }
      })
    } catch (err) {
      console.error(err)
      res.status(500).send({
        error: "Error inserting photo into DB.  Please try again later."
      })
    }
  } else {
    res.status(400).send({
      error: "Request body is not a valid photo object"
    })
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
