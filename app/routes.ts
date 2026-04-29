import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route('/auth','routes/auth.tsx'),
    route('/upload','routes/upload.tsx'),
    route('/interview','routes/interview.tsx'),
    route('/jobs','routes/jobs.tsx'),
    route('/cover-letter','routes/cover-letter.tsx'),
    route('/resume/:id','routes/resume.tsx'),
    route('/wipe','routes/wipe.tsx'),
    route('/api/generate-questions', 'routes/api.generate-questions.ts')
] satisfies RouteConfig;
