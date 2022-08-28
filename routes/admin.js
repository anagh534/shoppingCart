var express = require('express');
const product = require('../helper/productHelper');
var router = express.Router();
const adminHelper = require('../helper/adminHelper')
const bcrypt = require('bcrypt');
const order = require('../helper/orderHelper');
const user = require('../helper/userHelper');
const objId = require('mongoose').Types.ObjectId
const verifyLogin = (req, res, next) => {
    if (req.session.admin == null) {
        res.redirect('/admin/login')
    } else {
        next()
    }
}

let Admin = true

/* GET admin listing. */
router.get('/', verifyLogin, function (req, res, next) {
    product.find({}).lean()
        .then((data) => {
            res.render('admin/view-products', { Admin, data })
        })
        .catch((err) => {
            // console.log(err);
        })
});
router.get('/login', (req, res) => {
    if (req.session.admin) {
        res.redirect('/admin')
    } else {
        Admin.hide = true
        res.render('admin/login', { "LoginErr": req.session.adminLoginErr, Admin })
        Admin.hide = false
        req.session.adminLoginErr = false
    }
});
router.post('/login', async (req, res) => {
    let response = {}
    let myAdmin = await adminHelper.find({ email: req.body.email }).lean();
    if (myAdmin[0]) {
        bcrypt.compare(req.body.password, myAdmin[0].password).then((status) => {
            if (status) {
                response.admin = myAdmin[0];
                req.session.admin = response.admin;
                req.session.admin.loggedIn = true;
                res.redirect('/admin')
            } else {
                req.session.adminLoginErr = true;
                res.redirect('/admin/login')
            }
        })
    } else {
        req.session.adminLoginErr = true;
        res.redirect('/admin/login')
    }
});
router.get('/add-product', verifyLogin, (req, res) => {
    res.render('admin/add-product', { Admin })
});
router.post('/add-product', verifyLogin, async (req, res) => {
    let pro = new product(req.body);
    await pro.save().then(() => res.redirect('/admin'))
});
router.get('/delete-product/:id', verifyLogin, (req, res) => {
    let proId = req.params.id
    product.remove({ _id: proId }).then(() => {
        res.redirect('/admin/')
    })
});
router.get('/edit-product/:id', verifyLogin, async (req, res) => {
    let Products = await product.find({ _id: req.params.id }).lean();
    res.render('admin/edit-product', { product: Products[0], Admin })
});
router.post("/edit-product/:id", verifyLogin, (req, res) => {
    product.updateOne({ _id: req.params.id }, {
        $set: {
            name: req.body.name,
            category: req.body.category,
            discription: req.body.discription,
            price: req.body.price,
            image: req.body.image
        }
    }).then(() => {
        res.redirect('/admin')
    })
});
router.get('/logout', verifyLogin, (req, res) => {
    req.session.admin = null;
    res.redirect('/admin')
});
router.get('/all-orders', verifyLogin, async (req, res) => {
    let orders = await order.find({}).lean()
    res.render('admin/all-orders', { Admin, orders })
});
router.get('/status/:_id/:status', verifyLogin, (req, res) => {
    order.updateOne({ _id: objId(req.params._id) }, {
        $set: {
            status: req.params.status
        }
    }).then(() => {
        res.redirect('/admin/all-orders')
    })
    console.log(req.params)
});
router.get('/all-users', verifyLogin, (req, res) => {
    user.find({}).lean().then((users) => {
        res.render('admin/all-users', { users, Admin })
    })
});
router.get('/deleteUser/:id', verifyLogin, (req, res) => {
    user.deleteOne({ _id: objId(req.params.id) }).then(() => {
        res.redirect('/admin/all-users')
    })
})

module.exports = router;