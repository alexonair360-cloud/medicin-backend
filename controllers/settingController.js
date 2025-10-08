import Setting from '../models/Setting.js';

export const getSettings = async (req, res, next) => {
  try {
    const s = await Setting.findOne({});
    res.json(s || {});
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const s = await Setting.findOneAndUpdate({}, req.body, { upsert: true, new: true });
    res.json(s);
  } catch (err) {
    next(err);
  }
};


