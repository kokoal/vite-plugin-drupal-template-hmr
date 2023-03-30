const doHMR = (options) => {
  if (import.meta.hot) {
    import.meta.hot.on('drupal:update:twig', async (ctx) => {
      console.log(ctx);

      if (!ctx.file.includes('templates')) {
        throw new Error('All your twig templates needs to be located in a "templates" folder at the root of your component.');
      }

      const currentHtml = document.documentElement.innerHTML;
      if (!isTwigDevMode(currentHtml)) {
        throw new Error('You have to setup twig dev mode in your Drupal install in order to make HMR work on template update.');
      }

      /*
       * Useful if your Vite root is not the same as your Drupal project/theme one.
       * For example if you have Vite and Drupal in separate Docker containers maybe you don't want to add all your
       * Drupal install into your Vite container, this will result in different root for updated files via HMR.
       */
      const templateBase = options.templateBase.endsWith('/') ? options.templateBase.slice(0, -1) : options.templateBase;
      const templateName = ctx.file.match(new RegExp(`templates\/.*`))[0];
      const resolvedTemplateName = `${templateBase}/${templateName}`;

      const url = new URL(window.location.href);
      const response = await fetch(url);
      const dom = await response.text();
      const currentHtmlTemplateList = findTemplateInHtml(resolvedTemplateName, currentHtml);
      const reloadedHtmlTemplateList = findTemplateInHtml(resolvedTemplateName, dom);

      if (currentHtmlTemplateList.length <= 0 || reloadedHtmlTemplateList.length <= 0 || currentHtmlTemplateList.length !== reloadedHtmlTemplateList.length) {
        location.reload();
        return;
      }

      const commentWalker = document.createTreeWalker(
        document.querySelector('body'),
        NodeFilter.SHOW_COMMENT,
        null,
      );
      const templateCommentList = searchTemplateCommentList(commentWalker, resolvedTemplateName);

      reloadedHtmlTemplateList.forEach((htmlTemplate, index) => {
        const templateInfo = {
          template: htmlTemplate,
          comment: templateCommentList[index],
        };


        replaceTemplate(templateInfo);
      });
    });
  }
};

const replaceTemplate = (templateInfo) => {
  const betweenCommentWalker = document.createTreeWalker(
    templateInfo.comment.begin,
    NodeFilter.SHOW_ALL,
    null,
  );

  // Remove all siblings until end comment.
  let end = false;
  let node = betweenCommentWalker.currentNode;
  const toRemove = [];
  while (end === false) {
    node = node.nextSibling;

    if (node === null || node === undefined) {
      end = true;
    }
    else if (node.nodeType === Node.COMMENT_NODE && node.data === templateInfo.comment.end.data) {
      end = true;
    }
    else if (node.nodeType === Node.COMMENT_NODE && node.data !== templateInfo.comment.begin.data || node.nodeType !== Node.COMMENT_NODE) {
      toRemove.push(node);
    }
  }

  toRemove.forEach(node => node.remove());

  // Transform fetched template into dom elements.
  const parser = new DOMParser();
  const templateHtml = parser.parseFromString(templateInfo.template, 'text/html');
  const endCommentParent = templateInfo.comment.end.parentNode;

  const toInsertBefore = [...templateHtml.body.childNodes];
  toInsertBefore.filter(node => node.nodeType !== Node.COMMENT_NODE)
    .forEach(node => endCommentParent.insertBefore(node, templateInfo.comment.end));
}

const searchTemplateCommentList = (walker, templateFileName) => {
  const beginOutput = getCommentContent(templateFileName, 'begin');
  const endOutput = getCommentContent(templateFileName, 'end');
  let end = false;
  let beginComment = undefined;
  let list = [];

  while (end === false) {
    const node = walker.nextNode();

    if (node === null) {
      end = true;
    }
    else if (transformTextIntoComment(node.data) === beginOutput) {
      beginComment = node;
    }
    else if (beginComment instanceof Node && transformTextIntoComment(node.data) === endOutput) {
      list.push({
        begin: beginComment,
        end: node,
      });
      beginComment = undefined;
    }
  }

  return list;
}


const findTemplateInHtml = (templateFileName, html) => {
  const beginOutput = getCommentContent(templateFileName, 'begin');
  const endOutput = getCommentContent(templateFileName, 'end');
  // Use matchAll because the template can be used multiple times in the same page.
  const regexp = new RegExp(`${beginOutput}.*?${endOutput}`, 'gmsd');

  return [...html.matchAll(regexp)];
}

const getCommentContent = (templateFileName, type) => {
  if (type === 'begin') {
    return `<!-- BEGIN OUTPUT from '${templateFileName}' -->`;
  }

  if (type === 'end') {
    return `<!-- END OUTPUT from '${templateFileName}' -->`;
  }
}

const transformTextIntoComment = (text) => {
  return `<!--${text}-->`;
}

const isTwigDevMode = (html) => {
  const found = html.match("<!-- THEME DEBUG -->");
  return found !== null && found.length > 0;
}

export {
  doHMR,
}
