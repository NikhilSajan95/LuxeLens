// middlewares/validate.js

// A helper function to format Zod's error array
function formatZodErrors(issues) {
    const errors = {};
    for (const issue of issues) {
        // Creates a path like "variants[0][color]"
        const path = issue.path.reduce((acc, val) => {
            return typeof val === 'number' ? `${acc}[${val}]` : (acc ? `${acc}[${val}]` : val);
        }, '');
        errors[path] = issue.message;
    }
    return errors;
}

const validate = (schema) => (req, res, next) => {
    try {
        // Check if variants exist and convert from object to array
        if (req.body.variants && typeof req.body.variants === 'object' && !Array.isArray(req.body.variants)) {
            req.body.variants = Object.values(req.body.variants);
        }

        if (req.files && req.files.length > 0 && !req.body.variants) {
            req.body.variants = []; 
        }

        // Merge files logic
        if (req.files && req.body.variants) {
            for (const file of req.files) {
                const match = file.fieldname.match(/^variants\[(\d+)\]\[images\]$/);
                if (match) {
                    const index = match[1];
                    if (!req.body.variants[index]) {
                        req.body.variants[index] = {}; 
                    }
                    if (!req.body.variants[index].images) {
                        req.body.variants[index].images = [];
                    }
                    req.body.variants[index].images.push(file); 
                }
            }
        }
        
        schema.parse(req.body);
        next();
        
    } catch (e) {
        
        if (e.issues) {
            // This is a Zod error
            console.log("Zod Validation Errors:", e.issues);
            return res.status(400).json({
                success: false,
                message: "Validation failed. Please check your inputs.",
                errors: formatZodErrors(e.issues)
            });
        } else {
            // This is a different, unexpected error (like a TypeError)
            console.error("Critical Middleware Error:", e);
            return res.status(500).json({ 
                success: false,
                message: "A server error occurred during validation." 
            });
        }
    }
};

module.exports = validate;