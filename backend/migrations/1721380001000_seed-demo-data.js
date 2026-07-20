exports.up = async (pgm) => {
  const locations = [
    { name: 'Общий зал', description: 'Открытое пространство для работы', price: 5.0, rows: 4, cols: 6 },
    { name: 'VIP-комната', description: 'Отдельные кабинеты повышенного комфорта', price: 12.0, rows: 3, cols: 4 },
    { name: 'Зона коворкинга', description: 'Гибкие места у окна', price: 7.5, rows: 5, cols: 5 },
  ];

  for (const loc of locations) {
    const result = await pgm.db.query(
      `INSERT INTO locations (name, description, price_per_hour_byn, rows, cols)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [loc.name, loc.description, loc.price, loc.rows, loc.cols]
    );
    const locationId = result.rows[0].id;

    for (let r = 0; r < loc.rows; r++) {
      for (let c = 0; c < loc.cols; c++) {
        const seatNumber = `${String.fromCharCode(65 + r)}${c + 1}`;
        const seatType = Math.random() < 0.15 ? 'vip' : 'standard';
        await pgm.db.query(
          `INSERT INTO seats (location_id, seat_number, row_index, col_index, seat_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [locationId, seatNumber, r, c, seatType]
        );
      }
    }
  }
};

exports.down = (pgm) => {
  pgm.sql('TRUNCATE TABLE locations RESTART IDENTITY CASCADE');
};
