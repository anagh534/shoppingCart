const { response } = require('express');
const productHelpers = require('../helpers/product-helpers');
var express = require('express');
var router = express.Router();
var fast2sms = require('fast-two-sms');
require('dotenv').config();
const verifyLogin = (req, res, next) => {
  if (req.session.logged) {
    next()
  } else {
    res.redirect('/admin/login')
  }
}

/* GET users listing. */
router.get('/', verifyLogin, function (req, res, next) {
  productHelpers.getAllproduct().then((data) => {
    var products = data;
    // console.log(data);
    res.render('admin/view-products', { admin: true, products });
  })
});
router.get('/login', (req, res) => {
  res.render('admin/login.hbs', { admin: true })
})
router.post('/login', async (req, res) => {
  //console.log(req.body);
  await productHelpers.login(req.body).then((response) => {
    //console.log(response.status);
    if (response.status) {
      req.session.admin = response.user;
      req.session.logged = true;
      res.redirect('/admin')
    } else {
      req.session.logged = false;
      res.redirect('/admin/login')
    }
  })
})
router.get('/add-product', verifyLogin, function (req, res) {
  res.render('admin/add-product', { admin: true })
})
router.post('/add-proudct', (req, res) => {
  // console.log(req.body)
  // console.log(req.files.img)
  productHelpers.addProudct(req.body, (id) => {
    let image = req.files.img
    image.mv('./public/product-image/' + id + '.jpg', (err, done) => {
      if (!err) {
        res.render('admin/add-product', { admin: true })
      } else {
        console.log(err);
      }
    })
  })
});
router.get('/delete-product/:id', verifyLogin, (req, res) => {
  let ProId = req.params.id
  // console.log(ProId);
  productHelpers.deleteProduct(ProId).then((response) => {
    res.redirect('/admin/')
  })
})
router.get('/edit-product/:id', verifyLogin, async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id)
  // console.log(product);
  res.render('admin/edit-product', { product, admin: true })
})
router.post('/edit-product/:id', (req, res) => {
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    // console.log(req.params);
    let id = req.params.id
    res.redirect('/admin')
    if (req.files.img) {
      let image = req.files.img
      image.mv('./public/product-image/' + id + '.jpg')
    }
  })
})
router.get('/all-orders', verifyLogin, async (req, res) => {
  await productHelpers.getAllOrders().then((orders) => {
    // console.log(orders);
    res.render('admin/all-orders', { admin: true, orders })
  })
})
router.get('/view-order-products/:id', verifyLogin, async (req, res) => {
  await productHelpers.viewOrderProducts(req.params.id).then((products) => {
    // console.log(products);
    res.render("admin/all-ordered-products", { admin: true, products })
  })
})
router.get('/all-users', verifyLogin, async (req, res) => {
  let users = await productHelpers.getAllUsers()
  res.render('admin/all-users', { admin: true, users })
})
router.get('/delivery-success/:id', verifyLogin, (req, res) => {
  // console.log("called");
  productHelpers.deliverProduct(req.params.id).then((userData) => {
    // console.log(data);
    var msg = "Your Order is Devliverd Successfully."
    fast2sms.sendMessage()
    res.redirect('/admin/all-orders')
  })
})
router.get('/cancel-this-order/:id', verifyLogin, (req, res) => {
  // console.log("called");
  productHelpers.cancelOrder(req.params.id).then(() => {
    res.redirect('/admin/all-orders')
  })
})
router.get('/packed/:id', verifyLogin, (req, res) => {
  // console.log("called");
  productHelpers.packOrder(req.params.id).then(() => {
    res.redirect('/admin/all-orders')
  })
})
router.get('/shipped/:id', (req, res) => {
  productHelpers.shippedOrder(req.params.id).then(() => {
    res.redirect('/admin/all-orders')
  })
})

module.exports = router;