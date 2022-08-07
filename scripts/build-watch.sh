pnpm -C ./packages/math build --watch & 
sleep 5 && pnpm -C ./packages/core build --watch & 
sleep 10 && pnpm -C ./packages/dalpeng build --watch