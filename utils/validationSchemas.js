// utils/validationSchemas.js
const { z } = require('zod');

// --- Helper Schemas for Type Conversion ---
const stringToNumber = z.string()
    .transform((val, ctx) => {
        const parsed = parseFloat(val);
        if (isNaN(parsed)) {
            ctx.addIssue({
                code: 'custom',
                message: "Must be a valid number.",
            });
            return z.NEVER;
        }
        return parsed;
    })
    .pipe(z.number().gt(0, { message: "Regular Price must be greater than 0." }));

const stringToOptionalNumber = z.string()
    .optional()
    .transform((val, ctx) => {
        if (!val) return undefined;
        const parsed = parseFloat(val);
        if (isNaN(parsed)) {
            ctx.addIssue({
                code: 'custom',
                message: "Must be a valid number.",
            });
            return z.NEVER;
        }
        return parsed;
    })
    .pipe(z.number().gt(0, { message: "Offer Price must be a positive number." }).optional());

const stringToOptionalInteger = z.string()
    .optional()
    .transform((val, ctx) => {
        if (!val) return undefined; // It's optional, undefined is fine

        const parsedFloat = parseFloat(val);
        const parsedInt = parseInt(val, 10);

        if (isNaN(parsedFloat)) {
             ctx.addIssue({
                code: 'custom',
                message: "Warranty must be a valid number.",
            });
            return z.NEVER;
        }

        // This is the new check: it fails if the number has a decimal
        if (parsedFloat !== parsedInt) {
            ctx.addIssue({
                code: 'custom',
                message: "Warranty must be a whole number (e.g., 6, 12).",
            });
            return z.NEVER;
        }
        
        return parsedInt; // Return the valid integer
    })
    .pipe(z.number()
        // We can remove the .int() check here, as we already proved it's an integer
        .nonnegative({ message: 'Warranty must be 0 or greater.' })
        .optional()
    );

// --- UPDATED fileSchema ---
// This schema now correctly matches the object provided by Cloudinary
//  --- Schema for a Single File ---
const fileSchema = z.object({
    fieldname: z.string(),
    originalname: z.string(),
    encoding: z.string(),
    mimetype: z.string().startsWith("image/", { message: "Only image files are allowed." }),
    filename: z.string(),
    path: z.string(),
    size: z.number().max(5 * 1024 * 1024, { message: "File size must be less than 5MB." }),
});

// --- UPDATED: New Robust Variant Schema ---
const variantSchema = z.object({
    color: z.string().trim().min(1, { message: 'Variant color is required.' }),
    
    // 1. We just accept arrays of strings. The complex logic is below.
    sizes: z.array(z.string()),
    quantities: z.array(z.string()),
    
    // We validate these arrays separately
    images: z.array(fileSchema).optional(), 
    existing_images: z.array(z.string()).optional()

}).superRefine((data, ctx) => {
    // 2. This is where we validate the pairs
    const { sizes, quantities } = data;
    let hasAtLeastOnePair = false;

    if (sizes.length !== quantities.length) {
        ctx.addIssue({
            code: 'custom',
            message: 'Size and quantity data is mismatched.',
            path: ['sizes'] // Add error to the first field
        });
        return; // Stop validation
    }

    for (let i = 0; i < sizes.length; i++) {
        const size = sizes[i].trim();
        const quantity = quantities[i].trim();

        // Rule: If one is filled, the other must be.
        if (size && !quantity) {
            ctx.addIssue({
                code: 'custom',
                message: 'Quantity is required.',
                path: [`quantities[${i}]`] // Error on the specific quantity input
            });
        }
        if (!size && quantity) {
            ctx.addIssue({
                code: 'custom',
                message: 'Size is required.',
                path: [`sizes[${i}]`] // Error on the specific size input
            });
        }

        // Rule: If a pair exists, quantity must be a valid number >= 0
        if (size && quantity) {
            hasAtLeastOnePair = true;
            const parsedQty = parseInt(quantity, 10);
            if (isNaN(parsedQty) || parsedQty < 0) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'Must be 0 or more.',
                    path: [`quantities[${i}]`]
                });
            }
        }
    }

    // Rule: At least one complete size/quantity pair is required.
    if (!hasAtLeastOnePair) {
        ctx.addIssue({
            code: 'custom',
            message: 'At least one size/quantity pair is required.',
            path: ['sizes'] // Attach error to the general variant
        });
    }
    
    // Rule: Check total image count
    const existingCount = data.existing_images ? data.existing_images.length : 0;
    const newCount = data.images ? data.images.length : 0;
    if ((existingCount + newCount) < 3) {
         ctx.addIssue({
            code: 'custom',
            message: "Each variant must have at least 3 images in total.",
            path: ["images"],
        });
    }
});
// --- Main Product Schema 
const productSchema = z.object({
    title: z.string().trim().min(3, { message: 'Title must be at least 3 characters.' }),
    description: z.string().trim().max(2000, { message: 'Description is too long.' }).optional(),
    regular_price: stringToNumber,
    offer_price: stringToOptionalNumber.optional(),
    warranty: stringToOptionalInteger.optional(),
    variants: z.array(variantSchema).min(1, { message: "At least one product variant is required." })
}).refine(data => {
    if (data.offer_price && data.regular_price) {
        return data.offer_price < data.regular_price;
    }
    return true;
}, {
    message: 'Offer Price must be less than the Regular Price.',
    path: ['offer_price'],
});

module.exports = {
    productSchema
};