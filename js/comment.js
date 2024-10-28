import { card } from './card.js';
import { util } from './util.js';
import { theme } from './theme.js';
import { storage } from './storage.js';
import { pagination } from './pagination.js';
import { request, HTTP_GET, HTTP_POST, HTTP_DELETE, HTTP_PUT } from './request.js';

export const comment = (() => {

    const owns = storage('owns');
    const session = storage('session');
    const showHide = storage('comment');

    const remove = async (button) => {
        if (!confirm('Are you sure?')) {
            return;
        }

        const id = button.getAttribute('data-uuid');

        if (session.get('token')?.split('.').length === 3) {
            owns.set(id, button.getAttribute('data-own'));
        }

        const btn = util.disableButton(button);

        const status = await request(HTTP_DELETE, '/api/comment/' + owns.get(id))
            .token(session.get('token'))
            .then((res) => res.data.status);

        if (!status) {
            btn.restore();
            return;
        }

        owns.unset(id);
        document.getElementById(id).remove();

        document.querySelectorAll('[data-uuids]').forEach((n) => {
            const oldUuids = n.getAttribute('data-uuids').split(',');

            if (oldUuids.find((i) => i === id)) {
                const uuids = oldUuids.filter((i) => i !== id).join(',');
                n.setAttribute('data-uuids', uuids);

                if (uuids.length === 0) {
                    n.remove();
                }
            }
        });
    };

    const changeButton = (id, disabled) => {
        const buttonMethod = ['reply', 'edit', 'remove'];

        buttonMethod.forEach((v) => {
            const status = document.querySelector(`[onclick="comment.${v}(this)"][data-uuid="${id}"]`);
            if (status) {
                status.disabled = disabled;
            }
        });
    };

    const update = async (button) => {
        const id = button.getAttribute('data-uuid');

        const presence = document.getElementById(`form-inner-presence-${id}`);
        if (presence) {
            presence.disabled = true;
        }

        const form = document.getElementById(`form-${id ? `inner-${id}` : 'comment'}`);
        form.disabled = true;

        const cancel = document.querySelector(`[onclick="comment.cancel('${id}')"]`);
        if (cancel) {
            cancel.disabled = true;
        }

        const btn = util.disableButton(button);

        const status = await request(HTTP_PUT, '/api/comment/' + owns.get(id))
            .token(session.get('token'))
            .body({
                presence: presence ? presence.value === "1" : null,
                comment: form.value
            })
            .then((res) => res.data.status);

        form.disabled = false;
        if (cancel) {
            cancel.disabled = false;
        }

        if (presence) {
            presence.disabled = false;
        }

        btn.restore();

        if (status) {
            comment();
        }
    };

    const send = async (button) => {
        const id = button.getAttribute('data-uuid');

        const name = document.getElementById('form-name');
        if (name.value.length == 0) {
            alert('Mohon isi nama');
            return;
        }

        if (!id && name) {
            name.disabled = true;
        }

        const presence = document.getElementById('form-presence');
        if (!id && presence && presence.value == "0") {
            alert('Mohon konfirmasi kehadiran');
            return;
        }

        if (presence && presence.value != "0") {
            presence.disabled = true;
        }

        const invitedby = document.getElementById('form-invitedby');
        invitedby.disabled = true;

        const presenceQuantity = document.getElementById('form-quantity');
        if (!presenceQuantity && presenceQuantity.value < 0) {
            alert('Jumlah kehadiran tidak boleh dibawah 0')
            return
        }

        if (presenceQuantity && presenceQuantity.value > 0) {
            presenceQuantity.disabled = true;
        }

        const form = document.getElementById(`form-${id ? `inner-${id}` : 'comment'}`);
        form.disabled = true;

        const cancel = document.querySelector(`[onclick="comment.cancel('${id}')"]`);
        if (cancel) {
            cancel.disabled = true;
        }

        const btn = util.disableButton(button);

        // const response = await request('POST', 'http://localhost:3000')
        //     .token(session.get('token'))
        //     .body({
        //         id: id,
        //         name: name.value,
        //         presence: presence ? presence.value === "1" : true,
        //         num_presence: presenceQuantity.value,
        //         comment: form.value
        //     })
        //     .then();
        const response = await fetch('http://localhost:3000', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true'
            },
            body: JSON.stringify({
                name: name.value,
                presence: presence ? Number(presence.value === "1") : 1,
                num_presence: presenceQuantity.value,
                comment: form.value
            })
        })
            .then(res => res.json());

        if (name) {
            name.disabled = false;
        }

        invitedby.disabled = false;
        presenceQuantity.disabled = false;
        form.disabled = false;
        if (cancel) {
            cancel.disabled = false;
        }

        if (presence) {
            presence.disabled = false;
        }

        btn.restore();

        if (response?.code === 201) {
            owns.set(response.uuid, response.own);
            form.value = null;

            if (presence) {
                presence.value = "0";
            }

            if (!id) {
                await pagination.reset();
                document.getElementById('comments').scrollIntoView({ behavior: 'smooth' });
            }

            if (id) {
                showHide.set('hidden', showHide.get('hidden').concat([{ uuid: response.uuid, show: true }]));
                showHide.set('show', showHide.get('show').concat([id]));
                await comment();
            }
        }
    };

    const cancel = (id) => {
        if (document.getElementById(`form-inner-${id}`).value.length === 0 || confirm('Are you sure?')) {
            changeButton(id, false);
            document.getElementById(`inner-${id}`).remove();
        }
    };

    const reply = (button) => {
        const id = button.getAttribute('data-uuid');

        if (document.getElementById(`inner-${id}`)) {
            return;
        }

        changeButton(id, true);

        const inner = document.createElement('div');
        inner.classList.add('my-2');
        inner.id = `inner-${id}`;
        inner.innerHTML = `
        <label for="form-inner-${id}" class="form-label">Reply</label>
        <textarea class="form-control shadow-sm rounded-4 mb-2" id="form-inner-${id}" placeholder="Type reply comment"></textarea>
        <div class="d-flex flex-wrap justify-content-end align-items-center mb-0">
            <button style="font-size: 0.8rem;" onclick="comment.cancel('${id}')" class="btn btn-sm btn-outline-${theme.isDarkMode('light', 'dark')} rounded-4 py-0 me-1">Cancel</button>
            <button style="font-size: 0.8rem;" onclick="comment.send(this)" data-uuid="${id}" class="btn btn-sm btn-outline-${theme.isDarkMode('light', 'dark')} rounded-4 py-0">Send</button>
        </div>`;

        document.getElementById(`button-${id}`).insertAdjacentElement('afterend', inner);
    };

    const edit = async (button) => {
        const id = button.getAttribute('data-uuid');

        if (document.getElementById(`inner-${id}`)) {
            return;
        }

        changeButton(id, true);
        const tmp = button.innerText;
        button.innerText = 'Loading..';

        const status = await request(HTTP_GET, '/api/comment/' + id)
            .token(session.get('token'))
            .then((res) => res);

        if (status?.code === 200) {
            const inner = document.createElement('div');
            inner.classList.add('my-2');
            inner.id = `inner-${id}`;
            inner.innerHTML = `
            <label for="form-inner-${id}" class="form-label">Edit</label>
            ${document.getElementById(id).getAttribute('data-parent') === 'true' ? `
            <select class="form-select shadow-sm mb-2 rounded-4" id="form-inner-presence-${id}">
                <option value="1" ${status.data.presence ? 'selected' : ''}>Datang</option>
                <option value="2" ${status.data.presence ? '' : 'selected'}>Berhalangan</option>
            </select>` : ''}
            <textarea class="form-control shadow-sm rounded-4 mb-2" id="form-inner-${id}" placeholder="Type update comment"></textarea>
            <div class="d-flex flex-wrap justify-content-end align-items-center mb-0">
                <button style="font-size: 0.8rem;" onclick="comment.cancel('${id}')" class="btn btn-sm btn-outline-${theme.isDarkMode('light', 'dark')} rounded-4 py-0 me-1">Cancel</button>
                <button style="font-size: 0.8rem;" onclick="comment.update(this)" data-uuid="${id}" class="btn btn-sm btn-outline-${theme.isDarkMode('light', 'dark')} rounded-4 py-0">Update</button>
            </div>`;

            document.getElementById(`button-${id}`).insertAdjacentElement('afterend', inner);
            document.getElementById(`form-inner-${id}`).value = status.data.comment;
        }

        button.innerText = tmp;
    };

    const comment = async () => {
        // card.renderLoading();
        const comments = document.getElementById('comments');
        const onNullComment = `<div class="h6 text-center fw-bold p-4 my-3 bg-theme-${theme.isDarkMode('dark', 'light')} rounded-4 shadow">Yuk bagikan undangan ini biar banyak komentarnya</div>`;

        // await request(HTTP_GET, `/api/comment?per=${pagination.getPer()}&next=${pagination.getNext()}`)
        //     .token(session.get('token'))
        //     .then((res) => {
        //         pagination.setResultData(res.data.length);

        //         if (res.data.length === 0) {
        //             comments.innerHTML = onNullComment;
        //             return;
        //         }

        //         showHide.set('hidden', (() => {
        //             let arrHidden = showHide.get('hidden');
        //             util.extractUUIDs(res.data).forEach((c) => {
        //                 if (!arrHidden.find((item) => item.uuid === c)) {
        //                     arrHidden.push({ uuid: c, show: false });
        //                 }
        //             });

        //             return arrHidden;
        //         })());

        //         comments.setAttribute('data-loading', 'false');
        //         comments.innerHTML = res.data.map((comment) => card.renderContent(comment)).join('');
        //         res.data.forEach(card.fetchTracker);
        //     });
        await fetch(`http://localhost:3000?per=${pagination.getPer()}&next=${pagination.getNext()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true'
            }
        })
            .then(res => res.json())
            .then((res) => {
                pagination.setResultData(res.length);

                if (res.length === 0) {
                    comments.innerHTML = onNullComment;
                    return;
                }

                showHide.set('hidden', (() => {
                    let arrHidden = showHide.get('hidden');
                    util.extractUUIDs(res).forEach((c) => {
                        if (!arrHidden.find((item) => item.uuid === c)) {
                            arrHidden.push({ uuid: c, show: false });
                        }
                    });

                    return arrHidden;
                })());

                comments.setAttribute('data-loading', 'false');
                comments.innerHTML = res.map((comment) => card.renderContent(comment)).join('');
                res.forEach(card.fetchTracker);
            });
        
        // await fetch('http://localhost:3000', {
        //     method: 'GET',
        //     headers: {
        //         'Accept': 'application/json',
        //         'Content-Type': 'application/json',
        //         'Access-Control-Allow-Origin': '*',
        //         'Access-Control-Allow-Credentials': 'true'
        //     }
        // })
        //     .then(res => res.json())
        //     .then((res) => {
        //         if (res.length === 0) {
        //             comments.innerHTML = onNullComment;
        //             return;
        //         }

        //         comments.setAttribute('data-loading', 'false');
        //         comments.innerHTML = res.map((comment) => card.renderContent(comment)).join('');
        //         res.forEach(card.fetchTracker);
        //     })
    };

    const showOrHide = (button) => {
        const ids = button.getAttribute('data-uuids').split(',');
        const show = button.getAttribute('data-show') === 'true';
        const uuid = button.getAttribute('data-uuid');

        if (show) {
            button.setAttribute('data-show', 'false');
            button.innerText = 'Show replies';
            button.innerText += ' (' + ids.length + ')';

            showHide.set('show', showHide.get('show').filter((item) => item !== uuid));
        } else {
            button.setAttribute('data-show', 'true');
            button.innerText = 'Hide replies';

            showHide.set('show', showHide.get('show').concat([uuid]));
        }

        for (const id of ids) {
            showHide.set('hidden', showHide.get('hidden').map((item) => {
                if (item.uuid === id) {
                    item.show = !show;
                }

                return item;
            }));

            if (!show) {
                document.getElementById(id).classList.remove('d-none');
            } else {
                document.getElementById(id).classList.add('d-none');
            }
        }
    };

    const init = () => {
        if (!showHide.has('hidden')) {
            showHide.set('hidden', []);
        }

        if (!showHide.has('show')) {
            showHide.set('show', []);
        }
    };

    return {
        init,
        cancel,
        send,
        edit,
        reply,
        remove,
        update,
        comment,
        showOrHide,
        renderLoading: card.renderLoading,
    }
})();