CREATE TABLE tool_catalog (
    model TEXT PRIMARY KEY,
    sort_order INTEGER NOT NULL UNIQUE,
    type TEXT NOT NULL,
    diameter REAL NOT NULL CHECK (diameter > 0),
    length REAL NOT NULL CHECK (length > 0),
    tooth_count INTEGER NOT NULL CHECK (tooth_count > 0),
    material TEXT NOT NULL,
    description TEXT NOT NULL,
    image_path TEXT NOT NULL
);

INSERT INTO tool_catalog (model, sort_order, type, diameter, length, tooth_count, material, description, image_path)
VALUES
    ('2F365-0600-050-TD   1745', 1, '整体式', 6, 66, 4, '硬质合金', 'CoroMill® Plura, solid carbide end mill for high feed side milling', '立铣刀/整体式立铣刀/2F365-0600-050-TD   1745/292729489__400X40072Dpi.jpg'),
    ('2F365-0800-050-TD   1745', 2, '整体式', 8, 73, 4, '硬质合金', 'CoroMill® Plura, solid carbide end mill for high feed side milling', '立铣刀/整体式立铣刀/2F365-0800-050-TD   1745/292729489__400X40072Dpi.jpg'),
    ('2F366-1000-050-TD   1745', 3, '整体式', 10, 87, 4, '硬质合金', 'CoroMill® Plura, solid carbide end mill for high feed side milling', '立铣刀/整体式立铣刀/2F366-1000-050-TD   1745/292729595__400X40072Dpi.jpg'),
    ('2F366-1200-050-TD   1745', 4, '整体式', 12, 103, 4, '硬质合金', 'CoroMill® Plura, solid carbide end mill for high feed side milling', '立铣刀/整体式立铣刀/2F366-1200-050-TD   1745/292729595__400X40072Dpi.jpg'),
    ('2F366-1600-050-TD   1745', 5, '整体式', 16, 124, 4, '硬质合金', 'CoroMill® Plura, solid carbide end mill for high feed side milling', '立铣刀/整体式立铣刀/2F366-1600-050-TD   1745/292729595__400X40072Dpi.jpg'),
    ('2F366-2000-050-TD   1745', 6, '整体式', 20, 142, 4, '硬质合金', 'CoroMill® Plura, solid carbide end mill for high feed side milling', '立铣刀/整体式立铣刀/2F366-2000-050-TD   1745/292729595__400X40072Dpi.jpg'),
    ('2F366-2500-050-TD   1745', 7, '整体式', 25, 170, 4, '硬质合金', 'CoroMill® Plura, solid carbide end mill for high feed side milling', '立铣刀/整体式立铣刀/2F366-2500-050-TD   1745/292729595__400X40072Dpi.jpg'),
    ('MS20-R016A16-10L', 8, '转位式', 16, 100, 2, '硬质合金', 'CoroMill® MS20, cutter for square shoulder milling', '立铣刀/转位式立铣刀/MS20-R016A16-10L/441887508__400X40072Dpi.jpg'),
    ('MS20-R018A16L-10L', 9, '转位式', 18, 145, 2, '硬质合金', 'CoroMill® MS20, cutter for square shoulder milling', '立铣刀/转位式立铣刀/MS20-R018A16L-10L/252731499__400X40072Dpi.jpg'),
    ('MS20-R020A20L-10L', 10, '转位式', 20, 170, 2, '硬质合金', 'CoroMill® MS20, cutter for square shoulder milling', '立铣刀/转位式立铣刀/MS20-R020A20L-10L/252731881__400X40072Dpi.jpg'),
    ('MS20-R025A25L-10L', 11, '转位式', 25, 210, 2, '硬质合金', 'CoroMill® MS20, cutter for square shoulder milling', '立铣刀/转位式立铣刀/MS20-R025A25L-10L/252725974__400X40072Dpi.jpg'),
    ('MS20-R030A25L-10L', 12, '转位式', 30, 210, 2, '硬质合金', 'CoroMill® MS20, cutter for square shoulder milling', '立铣刀/转位式立铣刀/MS20-R030A25L-10L/252727003__400X40072Dpi.jpg'),
    ('MS20-R040A32L-10L', 13, '转位式', 40, 250, 2, '硬质合金', 'CoroMill® MS20, cutter for square shoulder milling', '立铣刀/转位式立铣刀/MS20-R040A32L-10L/252727759__400X40072Dpi.jpg');
