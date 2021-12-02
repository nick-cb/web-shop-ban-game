import asyncHandler from "express-async-handler";
import { Cart } from "../models/cartModel";
import Order from "../models/orderModels";
import { Game } from "../models/productModel";

const getAllOrder = asyncHandler(async (_, res) => {
  const order = await Order.find({});

  res.json(order);
});

const getAllOrderByUser = asyncHandler(async (req, res) => {
  const { user } = req;
  if (!user) {
    return res.status(404);
  }
  try {
    let { limit, start_page } = req.query;
    let lim = 0;
    let start = 0;
    try {
      if (typeof limit === "string") {
        lim = parseInt(limit);
      }
      if (typeof start_page === "string") {
        start = parseInt(start_page);
      }
    } catch (error) {}

    const orders = await Order.find({ user: user._id })
      .skip(start * lim)
      .limit(lim)
      .populate({
        path: "cart",
        select: "products",
        populate: { path: "products.product", select: "name" },
      });
    return res.status(200).json(orders);
  } catch (error) {}
});

const createOrder = asyncHandler(async (req, res) => {
  try {
    const { user } = req;
    if (!user) return res.status(401);
    const {
      cartId,
      status,
      paymentMethod,
      details,
      paidAt,
      cancelledAt,
      total,
    } = req.body;

    const createdOrder = await Order.create({
      cart: cartId,
      status: status,
      user: user._id,
      payment_method: {
        method: paymentMethod,
        details: details,
      },
      paid_at: paidAt,
      cancelled_at: cancelledAt,
      total: total,
    });

    const existCart = await Cart.findOne({ _id: cartId });

    if (existCart) {
      existCart.status = false;
      await existCart.save();
      for (let game of existCart.products) {
        const existGame = await Game.findById(game.product);
        if (existGame) {
          const limit = game.quantity;
          let index = 0;
          for (let key of existGame.keys) {
            if (index === limit) {
              break;
            }
            //@ts-ignore
            if (!key.status) {
              //@ts-ignore
              key.status = true;
              //@ts-ignore
              game.keys.push(key.code);
              index = index + 1;
            }
          }
          existGame.markModified("keys");
          await existGame.save();
          await existCart.save();
        }
      }
    }

    return res.status(201).json(createdOrder);
  } catch (error: any) {
    return res.status(500).json({ messsage: error.message });
  }
});

// This is for lab
const createRevenueReport = asyncHandler(async (req, res) => {
  const { from, to } = req.body;
  const order = await Order.find({
    createdAt: {
      $gte: new Date(from).toISOString(),
      $lte: new Date(to).toISOString(),
    },
  }).populate({
    path: "cart user",
    select: "products email fist_name last_name",
    populate: {
      path: "products.product",
      select: "purchase_price sale_price quantity",
    },
  });

  res.json(order);
});

const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const order = await Order.findById(id).populate({
      path: "cart user",
      select: "products first_name last_name email",
      populate: { path: "products.product" },
    });

    if (!order) {
      return res.status(404);
    }
    console.log(order._id);

    res.json(order);
  } catch (error) {
    console.log(error);
    res.status(500);
  }
});

export {
  createOrder,
  createRevenueReport,
  getAllOrder,
  getOrderById,
  getAllOrderByUser,
};
