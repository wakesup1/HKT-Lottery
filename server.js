const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
dotenv.config();

// MongoDB Connection
const connectDB = require('./config/database');
const Purchase = require('./models/Purchase');
const LotteryResult = require('./models/LotteryResult');
const Draw = require('./models/Draw');

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

const getGeminiModel = (() => {
  let modelInstance = null;
  return () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return null;
    }
    if (!modelInstance) {
      const genAI = new GoogleGenerativeAI(apiKey);
      modelInstance = genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });
    }
    return modelInstance;
  };
})();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ข้อมูลผลรางวัล
let lotteryResults = {
  drawId: null,
  drawLabel: null,
  drawDate: null,
  firstPrize: null,
  threeDigitFront: [],
  threeDigitBack: [],
  twoDigitBack: null,
  lastUpdate: null,
  story: null,
  inspiration: null,
  chaosLevel: 0.5,
  algorithm: null,
  isLocked: false // เพิ่มฟิลด์สำหรับล็อคผล
};

// ข้อมูลการซื้อของลูกค้า
let customerPurchases = [];

const numberTypeConfig = {
  twoDigitBack: {
    length: 2,
    price: 1,
    label: 'เลขท้าย 2 ตัว',
    prizeLabel: 'รางวัลเลขท้าย 2 ตัว'
  },
  threeDigitFront: {
    length: 3,
    price: 1,
    label: 'เลขหน้า 3 ตัว',
    prizeLabel: 'รางวัลเลขหน้า 3 ตัว'
  },
  threeDigitBack: {
    length: 3,
    price: 1,
    label: 'เลขท้าย 3 ตัว',
    prizeLabel: 'รางวัลเลขท้าย 3 ตัว'
  }
};

const DRAW_INTERVAL_DAYS = 15;

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDrawLabel = (date) => {
  return `งวดประจำวันที่ ${date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`;
};

const createDraw = (sequence, baseDate = new Date()) => {
  return {
    id: `DRAW-${sequence.toString().padStart(4, '0')}`,
    sequence,
    date: baseDate,
    label: formatDrawLabel(baseDate)
  };
};

let drawSequence = 1;
let activeDraw = createDraw(drawSequence);

const advanceDraw = () => {
  const nextDate = addDays(activeDraw.date, DRAW_INTERVAL_DAYS);
  drawSequence += 1;
  activeDraw = createDraw(drawSequence, nextDate);
};

// Utility functions for creative lottery generation
const mulberry32 = (a) => {
  let t = a;
  return () => {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

const createSeed = (seedSource) => {
  const hash = crypto.createHash('sha256').update(seedSource).digest('hex');
  return parseInt(hash.slice(0, 8), 16);
};

const buildDigitWeights = (purchases, inspiration) => {
  const weights = new Array(10).fill(5);
  const recentPurchases = purchases.slice(-30);

  recentPurchases.forEach((purchase, index) => {
    const recencyBoost = recentPurchases.length - index;
    (purchase.entries || []).forEach((entry) => {
      const weightBoost = 2 * entry.amount + recencyBoost;
      (entry.number || '').split('').forEach((char) => {
        const digit = parseInt(char, 10);
        if (!Number.isNaN(digit)) {
          weights[digit] += weightBoost;
        }
      });
    });
  });

  if (inspiration) {
    const digitsInText = inspiration.match(/\d/g) || [];
    digitsInText.forEach((char) => {
      weights[parseInt(char, 10)] += 12;
    });

    inspiration
      .replace(/\d/g, '')
      .split('')
      .forEach((char) => {
        const asciiDigit = char.charCodeAt(0) % 10;
        weights[asciiDigit] += 4;
      });
  }

  return weights;
};

const blendWeightsWithChaos = (weights, chaos, rng) => {
  const average = weights.reduce((sum, value) => sum + value, 0) / weights.length;
  return weights.map((weight) => {
    const jitter = (rng() - 0.5) * chaos * average * 1.2;
    const blended = weight * (1 - chaos) + average * chaos + jitter;
    return Math.max(1, blended);
  });
};

const weightedRandomDigit = (rng, weights) => {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let target = rng() * total;
  for (let index = 0; index < weights.length; index += 1) {
    target -= weights[index];
    if (target <= 0) {
      return index;
    }
  }
  return weights.length - 1;
};

const generateNumberWithWeights = (length, rng, weights, chaos) => {
  const digits = [];
  const localWeights = blendWeightsWithChaos(weights, chaos, rng);
  for (let i = 0; i < length; i += 1) {
    digits.push(weightedRandomDigit(rng, localWeights));
  }
  return digits.join('');
};

const generateUniqueNumbers = (count, length, rng, weights, chaos) => {
  const numbers = new Set();
  let guard = 0;
  while (numbers.size < count && guard < 100) {
    const candidate = generateNumberWithWeights(length, rng, weights, chaos + rng() * 0.1);
    numbers.add(candidate.padStart(length, '0'));
    guard += 1;
  }
  while (numbers.size < count) {
    const fallback = Math.floor(rng() * 10 ** length)
      .toString()
      .padStart(length, '0');
    numbers.add(fallback);
  }
  return Array.from(numbers);
};

const composeStory = ({ inspiration, chaosLevel, trendingDigits, totalEntries, algorithmName }) => {
  const parts = [];
  if (inspiration) {
    parts.push(`แรงบันดาลใจจาก “${inspiration}”`);
  }
  if (totalEntries > 0) {
    const highlightedDigits = trendingDigits.slice(0, 2);
    const digitPhrase =
      highlightedDigits.length > 0 ? highlightedDigits.join(' และ ') : 'เลขลับที่แอบดัง';
    parts.push(`กระซิบจากเลขฮอต ${totalEntries} รายการ ที่เทใจให้ ${digitPhrase}`);
  }
  const chaosText = `ปรับระดับความคาดเดาไม่ได้ไว้ที่ ${Math.round(chaosLevel * 100)}%`;
  parts.push(chaosText);
  return `อัลกอริทึม ${algorithmName} ${parts.join(' + ')} ก่อนจะปล่อยเลขนำโชคงวดนี้ `;
};

const generateCreativeLotteryResults = ({
  inspiration = '',
  chaosLevel = 0.5,
  drawId,
  drawLabel,
  drawSequence
} = {}) => {
  const trimmedInspiration = inspiration.trim();
  const safeChaos = Math.min(Math.max(Number(chaosLevel) || 0.5, 0), 1);
  const timestamp = new Date();

  const purchaseSignature = customerPurchases
    .slice(-20)
    .map((purchase) =>
      (purchase.entries || [])
        .map((entry) => `${entry.numberType}:${entry.number}:${entry.amount}`)
        .join(',')
    )
    .join('|');

  const seedSource = [
    timestamp.toISOString(),
    trimmedInspiration.toLowerCase(),
    purchaseSignature,
    Math.random().toString(36).slice(2)
  ].join('::');

  const rng = mulberry32(createSeed(seedSource));

  const baseWeights = buildDigitWeights(customerPurchases, trimmedInspiration);
  const frontWeights = blendWeightsWithChaos(baseWeights, safeChaos * 0.5, rng);
  const backWeights = blendWeightsWithChaos(baseWeights.slice().reverse(), safeChaos * 0.7, rng).reverse();

  const firstPrize = generateNumberWithWeights(6, rng, baseWeights, safeChaos * 0.65).padStart(6, '0');
  const threeDigitFront = generateUniqueNumbers(2, 3, rng, frontWeights, safeChaos * 0.55);
  const threeDigitBack = generateUniqueNumbers(2, 3, rng, backWeights, Math.min(1, safeChaos * 0.8));

  const inspirationValue = trimmedInspiration
    ? trimmedInspiration
        .split('')
        .reduce((sum, char, index) => sum + (char.charCodeAt(0) * (index + 3)), 0)
    : 0;

  const purchasePulse = customerPurchases.slice(-15).reduce((sum, purchase) => {
    const entriesPulse = (purchase.entries || []).reduce((entrySum, entry) => {
      const tailValue = parseInt(entry.number.slice(-2), 10);
      return entrySum + (Number.isNaN(tailValue) ? 0 : tailValue) + entry.amount;
    }, 0);
    return sum + entriesPulse;
  }, 0);

  const chaosPulse = Math.floor(rng() * 100);
  const twoDigitValue = (parseInt(firstPrize.slice(-2), 10) + inspirationValue + purchasePulse + chaosPulse) % 100;
  const twoDigitBack = twoDigitValue.toString().padStart(2, '0');

  const trendingDigits = baseWeights
    .map((weight, digit) => ({ digit, weight }))
    .sort((a, b) => b.weight - a.weight)
    .map((item) => item.digit.toString());

  const algorithmName = 'Stardust Mixer';
  const recentEntriesCount = customerPurchases.slice(-30).reduce((sum, purchase) => {
    return sum + (purchase.entries ? purchase.entries.length : 0);
  }, 0);

  const story = composeStory({
    inspiration: trimmedInspiration,
    chaosLevel: safeChaos,
    trendingDigits,
    totalEntries: recentEntriesCount,
    algorithmName
  });

  return {
    drawId,
    drawLabel,
    drawSequence,
    drawDate: timestamp,
    firstPrize,
    threeDigitFront,
    threeDigitBack,
    twoDigitBack,
    lastUpdate: timestamp,
    story,
    inspiration: trimmedInspiration || null,
    chaosLevel: safeChaos,
    algorithm: algorithmName
  };
};

// API Routes

// Get lottery results
app.get('/api/results', async (req, res) => {
  try {
    const activeDraw = await Draw.getActiveDraw();
    const latestResult = await LotteryResult.getLatest();
    
    res.json({
      success: true,
      data: latestResult || lotteryResults,
      currentDraw: activeDraw ? {
        id: activeDraw.id,
        label: `งวดประจำวันที่ ${activeDraw.drawDate.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`,
        sequence: activeDraw.sequence,
        date: activeDraw.drawDate
      } : null
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
});

// Set lottery results (Admin function)
app.post('/api/results', async (req, res) => {
  try {
    const { inspiration, chaosLevel, isLocked, manualResults } = req.body || {};
    
    const activeDraw = await Draw.getActiveDraw();
    if (!activeDraw) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบงวดที่เปิดอยู่'
      });
    }

    const announcedDraw = {
      id: activeDraw.id,
      label: `งวดประจำวันที่ ${activeDraw.drawDate.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`,
      sequence: activeDraw.sequence,
      date: activeDraw.drawDate
    };

    let resultData;

    // ถ้าเลือกล็อคผล ให้ใช้ผลที่กรอกมา
    if (isLocked && manualResults) {
      resultData = {
        drawId: announcedDraw.id,
        firstPrize: manualResults.firstPrize,
        threeDigitFront: manualResults.threeDigitFront || [],
        threeDigitBack: manualResults.threeDigitBack || [],
        twoDigitBack: manualResults.twoDigitBack,
        isLocked: true,
        drawDate: new Date(),
        story: 'ผลรางวัลที่กำหนดโดย Admin',
        inspiration: inspiration || 'กำหนดเอง',
        chaosLevel: 0,
        algorithm: 'manual'
      };
    } 
    // ถ้าไม่ล็อค ให้ใช้ระบบสุ่ม
    else {
      // ดึงข้อมูลการซื้อล่าสุดมาช่วยสุ่ม
      const recentPurchases = await Purchase.find()
        .sort({ purchaseDate: -1 })
        .limit(30)
        .lean();

      // แปลงข้อมูลให้ตรงกับ format เก่า
      const formattedPurchases = recentPurchases.map(p => ({
        entries: p.entries
      }));

      // บันทึกข้อมูล purchase ชั่วคราวสำหรับการสุ่ม
      const oldPurchases = customerPurchases;
      customerPurchases = formattedPurchases;

      const generatedResults = generateCreativeLotteryResults({
        inspiration,
        chaosLevel,
        drawId: announcedDraw.id,
        drawLabel: announcedDraw.label,
        drawSequence: announcedDraw.sequence
      });

      // คืนค่า
      customerPurchases = oldPurchases;

      resultData = {
        drawId: generatedResults.drawId,
        firstPrize: generatedResults.firstPrize,
        threeDigitFront: generatedResults.threeDigitFront,
        threeDigitBack: generatedResults.threeDigitBack,
        twoDigitBack: generatedResults.twoDigitBack,
        isLocked: false,
        drawDate: new Date(),
        story: generatedResults.story,
        inspiration: generatedResults.inspiration,
        chaosLevel: generatedResults.chaosLevel,
        algorithm: generatedResults.algorithm
      };
    }

    // บันทึกผลลง MongoDB
    const newResult = new LotteryResult(resultData);
    await newResult.save();

    // ปิดงวดเก่า สร้างงวดใหม่
    activeDraw.isActive = false;
    await activeDraw.save();

    const nextDrawDate = new Date(activeDraw.drawDate);
    nextDrawDate.setDate(nextDrawDate.getDate() + DRAW_INTERVAL_DAYS);

    const nextDraw = new Draw({
      id: `DRAW-${(activeDraw.sequence + 1).toString().padStart(4, '0')}`,
      sequence: activeDraw.sequence + 1,
      drawDate: nextDrawDate,
      isActive: true
    });
    await nextDraw.save();

    res.json({
      success: true,
      message: 'ประกาศผลรางวัลสำเร็จ',
      data: resultData,
      nextDraw: {
        id: nextDraw.id,
        label: `งวดประจำวันที่ ${nextDraw.drawDate.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`,
        sequence: nextDraw.sequence,
        date: nextDraw.drawDate
      },
      announcedDraw
    });
  } catch (error) {
    console.error('Error announcing results:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการประกาศผล'
    });
  }
});

// Purchase lottery ticket (multiple entries per draw)
app.post('/api/purchase', async (req, res) => {
  try {
    const { customerName, entries } = req.body;

    if (!customerName || !entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อและเพิ่มเลขที่ต้องการซื้ออย่างน้อย 1 รายการ'
      });
    }

    const activeDraw = await Draw.getActiveDraw();
    if (!activeDraw) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบงวดที่เปิดอยู่'
      });
    }

    const normalizedEntries = [];
    let totalPrice = 0;

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index] || {};
      const numberType = entry.numberType;
      const number = typeof entry.number === 'string' ? entry.number.trim() : '';
      const amount = parseInt(entry.amount, 10);

      if (!numberType || !number || Number.isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: `รายการที่ ${index + 1} ข้อมูลไม่ครบถ้วน`
        });
      }

      const config = numberTypeConfig[numberType];
      if (!config) {
        return res.status(400).json({
          success: false,
          message: `ประเภทเลขของรายการที่ ${index + 1} ไม่ถูกต้อง`
        });
      }

      if (number.length !== config.length || !/^\d+$/.test(number)) {
        return res.status(400).json({
          success: false,
          message: `รายการที่ ${index + 1}: กรุณากรอกตัวเลข ${config.length} หลัก`
        });
      }

      const entryPrice = config.price;
      const entryTotal = entryPrice * amount;

      normalizedEntries.push({
        numberType,
        number,
        amount,
        status: 'pending'
      });

      totalPrice += entryTotal;
    }

    const purchase = new Purchase({
      drawId: activeDraw.id,
      customerName,
      entries: normalizedEntries,
      totalPrice,
      status: 'pending'
    });

    await purchase.save();

    // แปลงข้อมูลสำหรับส่งกลับไปหา frontend (format เดิม)
    const responseData = {
      id: purchase._id,
      drawId: purchase.drawId,
      drawLabel: `งวดประจำวันที่ ${activeDraw.drawDate.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`,
      drawSequence: activeDraw.sequence,
      drawDate: activeDraw.drawDate,
      customerName: purchase.customerName,
      entries: purchase.entries.map((entry, index) => {
        const config = numberTypeConfig[entry.numberType];
        return {
          id: Date.now() + index,
          numberType: entry.numberType,
          number: entry.number,
          label: config.label,
          prizeLabel: config.prizeLabel,
          amount: entry.amount,
          price: config.price,
          totalPrice: config.price * entry.amount,
          status: entry.status
        };
      }),
      totalPrice: purchase.totalPrice,
      purchaseDate: purchase.purchaseDate,
      status: purchase.status
    };

    res.json({
      success: true,
      message: 'ซื้อลอตเตอร์รี่สำเร็จ',
      data: responseData
    });
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    });
  }
});

// Get customer purchases
app.get('/api/purchases', async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .sort({ purchaseDate: -1 })
      .lean();

    // แปลงข้อมูลสำหรับ frontend
    const formattedPurchases = purchases.map(purchase => {
      // หา draw info
      const drawLabel = `งวดประจำวันที่ ${purchase.purchaseDate.toLocaleDateString('th-TH')}`;
      
      return {
        id: purchase._id,
        drawId: purchase.drawId,
        drawLabel: drawLabel,
        customerName: purchase.customerName,
        entries: purchase.entries.map((entry, index) => {
          const config = numberTypeConfig[entry.numberType];
          return {
            id: Date.now() + index,
            numberType: entry.numberType,
            number: entry.number,
            label: config.label,
            prizeLabel: config.prizeLabel,
            amount: entry.amount,
            price: config.price,
            totalPrice: config.price * entry.amount,
            status: entry.status
          };
        }),
        totalPrice: purchase.totalPrice,
        purchaseDate: purchase.purchaseDate,
        status: purchase.status
      };
    });

    res.json({
      success: true,
      data: formattedPurchases
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
});

// Check winning numbers
app.post('/api/check-winning', async (req, res) => {
  try {
    const { purchaseId } = req.body;
    
    const purchase = await Purchase.findById(purchaseId);
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการซื้อ'
      });
    }
    
    const result = await LotteryResult.getByDrawId(purchase.drawId);
    
    if (!result || !result.firstPrize) {
      return res.status(400).json({
        success: false,
        message: 'ยังไม่มีการประกาศผลรางวัล ใจเย็น ๆ น้า'
      });
    }

    let anyWin = false;
    const winningEntries = [];

    purchase.entries.forEach((entry) => {
      let entryWin = false;
      const prizeTypes = []; // เก็บรางวัลทั้งหมดที่ถูก
      
      switch (entry.numberType) {
        case 'twoDigitBack':
          // ตรวจสอบเลขท้าย 2 ตัวจากรางวัลเลขท้าย 2 ตัว
          if (result.twoDigitBack === entry.number) {
            prizeTypes.push('รางวัลเลขท้าย 2 ตัว');
          }
          // ตรวจสอบเลขท้าย 2 ตัวจากรางวัลที่ 1
          if (result.firstPrize && 
              result.firstPrize.slice(-2) === entry.number) {
            prizeTypes.push('รางวัลเลขท้าย 2 ตัวจากรางวัลที่ 1');
          }
          break;
          
        case 'threeDigitFront':
          // ตรวจสอบเลขหน้า 3 ตัวจากรางวัลเลขหน้า 3 ตัว
          if (result.threeDigitFront.includes(entry.number)) {
            prizeTypes.push('รางวัลเลขหน้า 3 ตัว');
          }
          // ตรวจสอบเลขหน้า 3 ตัวจากรางวัลที่ 1
          if (result.firstPrize && 
              result.firstPrize.slice(0, 3) === entry.number) {
            prizeTypes.push('รางวัลเลขหน้า 3 ตัวจากรางวัลที่ 1');
          }
          break;
          
        case 'threeDigitBack':
          // ตรวจสอบเลขท้าย 3 ตัวจากรางวัลเลขท้าย 3 ตัว
          if (result.threeDigitBack.includes(entry.number)) {
            prizeTypes.push('รางวัลเลขท้าย 3 ตัว');
          }
          // ตรวจสอบเลขท้าย 3 ตัวจากรางวัลที่ 1
          if (result.firstPrize && 
              result.firstPrize.slice(-3) === entry.number) {
            prizeTypes.push('รางวัลเลขท้าย 3 ตัวจากรางวัลที่ 1');
          }
          break;
          
        default:
          entryWin = false;
      }

      entryWin = prizeTypes.length > 0;
      entry.status = entryWin ? 'win' : 'lose';
      
      if (entryWin) {
        anyWin = true;
        prizeTypes.forEach(prizeType => {
          winningEntries.push({
            number: entry.number,
            prize: prizeType
          });
        });
      }
    });

    purchase.status = anyWin ? 'win' : 'lose';
    await purchase.save();

    res.json({
      success: true,
      data: {
        isWin: anyWin,
        prize: anyWin ? winningEntries.map((item) => item.prize).join(', ') : '',
        purchase: {
          id: purchase._id,
          drawId: purchase.drawId,
          customerName: purchase.customerName,
          entries: purchase.entries.map((entry, index) => {
            const config = numberTypeConfig[entry.numberType];
            return {
              id: Date.now() + index,
              numberType: entry.numberType,
              number: entry.number,
              label: config.label,
              prizeLabel: config.prizeLabel,
              amount: entry.amount,
              price: config.price,
              totalPrice: config.price * entry.amount,
              status: entry.status
            };
          }),
          totalPrice: purchase.totalPrice,
          purchaseDate: purchase.purchaseDate,
          status: purchase.status
        },
        winningEntries,
        draw: {
          id: result.drawId,
          label: `งวดประจำวันที่ ${result.drawDate.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}`
        }
      }
    });
  } catch (error) {
    console.error('Error checking winning:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบรางวัล'
    });
  }
});

// AI Lottery Prediction using Gemini
app.post('/api/predict', async (req, res) => {
  try {
    const { userInput } = req.body;
    
    const model = getGeminiModel();
    
    if (!model) {
      return res.status(500).json({
        success: false,
        message: 'กรุณาตั้งค่า GEMINI_API_KEY ในไฟล์ .env'
      });
    }
    
    const prompt = `คุณเป็นผู้เชี่ยวชาญในการวิเคราะห์ตัวเลขลอตเตอร์รี่ไทย โดยใช้ข้อมูลและรูปแบบทางสถิติ
    
ข้อมูลจากผู้ใช้: ${userInput || 'ไม่มีข้อมูลเพิ่มเติม'}

กรุณาวิเคราะห์และแนะนำเลขลอตเตอร์รี่ โดย:
1. แนะนำเลขท้าย 2 ตัว (2-3 ชุด)
2. แนะนำเลขหน้า 3 ตัว (2-3 ชุด)
3. แนะนำเลขท้าย 3 ตัว (2-3 ชุด)
4. วิเคราะห์รูปแบบตัวเลขที่อาจออก พร้อมเหตุผล

หมายเหตุ: การทำนายนี้เป็นเพียงการวิเคราะห์ทางสถิติ ไม่รับประกันความถูกต้อง`;

    const generation = await model.generateContent(prompt);
    const prediction = generation?.response?.text?.() || '';
    
    // Extract numbers from the prediction
    const twoDigitNumbers = prediction.match(/\b\d{2}\b/g) || [];
    const threeDigitNumbers = prediction.match(/\b\d{3}\b/g) || [];
    
    res.json({
      success: true,
      data: {
        prediction,
        suggestedTwoDigit: [...new Set(twoDigitNumbers)].slice(0, 3),
        suggestedThreeDigit: [...new Set(threeDigitNumbers)].slice(0, 3),
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error calling Gemini:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการทำนาย',
      error: error.message
    });
  }
});

// Get all winners for current draw
app.get('/api/winners', async (req, res) => {
  try {
    const latestResult = await LotteryResult.getLatest();
    
    if (!latestResult || !latestResult.firstPrize) {
      return res.status(400).json({
        success: false,
        message: 'ยังไม่มีการประกาศผลรางวัล ใจเย็น ๆ น้า'
      });
    }

    // ดึงการซื้อทั้งหมดของงวดปัจจุบัน
    const purchases = await Purchase.find({ drawId: latestResult.drawId });
    
    const winners = [];
    
    purchases.forEach(purchase => {
      const winningEntries = [];
      
      purchase.entries.forEach(entry => {
        const prizeTypes = [];
        
        switch (entry.numberType) {
          case 'twoDigitBack':
            if (latestResult.twoDigitBack === entry.number) {
              prizeTypes.push('รางวัลเลขท้าย 2 ตัว');
            }
            if (latestResult.firstPrize && 
                latestResult.firstPrize.slice(-2) === entry.number) {
              prizeTypes.push('รางวัลเลขท้าย 2 ตัวจากรางวัลที่ 1');
            }
            break;
            
          case 'threeDigitFront':
            if (latestResult.threeDigitFront.includes(entry.number)) {
              prizeTypes.push('รางวัลเลขหน้า 3 ตัว');
            }
            if (latestResult.firstPrize && 
                latestResult.firstPrize.slice(0, 3) === entry.number) {
              prizeTypes.push('รางวัลเลขหน้า 3 ตัวจากรางวัลที่ 1');
            }
            break;
            
          case 'threeDigitBack':
            if (latestResult.threeDigitBack.includes(entry.number)) {
              prizeTypes.push('รางวัลเลขท้าย 3 ตัว');
            }
            if (latestResult.firstPrize && 
                latestResult.firstPrize.slice(-3) === entry.number) {
              prizeTypes.push('รางวัลเลขท้าย 3 ตัวจากรางวัลที่ 1');
            }
            break;
        }
        
        if (prizeTypes.length > 0) {
          prizeTypes.forEach(prize => {
            winningEntries.push({
              number: entry.number,
              prize: prize,
              amount: entry.amount
            });
          });
        }
      });
      
      if (winningEntries.length > 0) {
        winners.push({
          purchaseId: purchase._id,
          customerName: purchase.customerName,
          purchaseDate: purchase.purchaseDate,
          winningEntries: winningEntries
        });
      }
    });

    res.json({
      success: true,
      data: {
        draw: {
          id: latestResult.drawId,
          label: `งวดประจำวันที่ ${latestResult.drawDate.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}`,
          date: latestResult.drawDate
        },
        winners: winners,
        totalWinners: winners.length
      }
    });
  } catch (error) {
    console.error('Error fetching winners:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ถูกรางวัล'
    });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(` Lottery Prediction Server กำลังทำงานที่ http://localhost:${PORT}`);
  console.log(` API Endpoints:`);
  console.log(`   GET  /api/results - ดูผลรางวัล`);
  console.log(`   POST /api/results - ประกาศผลรางวัล (Admin)`);
  console.log(`   POST /api/purchase - ซื้อเลข 2-3 ตัว`);
  console.log(`   GET  /api/purchases - ดูรายการซื้อทั้งหมด`);
  console.log(`   POST /api/check-winning - ตรวจสอบรางวัล`);
  console.log(`   GET  /api/winners - ดูรายชื่อผู้ถูกรางวัล (Admin)`);
  console.log(`   POST /api/predict - ทำนายด้วย AI`);
  console.log(`   POST /api/predict - ทำนายเลขด้วย AI`);
});
